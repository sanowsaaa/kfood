import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { trackAddToCart } from '../utils/metaPixel';
import { discountedMinor, normalizeCart, readCart, subtotalMinor, type StoredCartItem } from '../utils/customer';
import { cartSignature } from '../utils/checkoutAttempt';

export type CartItem = StoredCartItem;

interface ToastProduct {
  name: string;
  image: string;
  price: number;
}

interface PromoCodeInfo {
  code: string;
  discountPercent: number;
  expiresAt: string;
}

// Цените в базата са вече в EUR

// ПРОГРЕСИВНИ ОТСТЪПКИ (в евро):
// - Минимална поръчка: €10
// - Над €50 → 5% отстъпка
// - Над €100 → 10% отстъпка
export interface DiscountTier {
  minEur: number;
  percent: number;
  label: string;
}

export const DISCOUNT_TIERS: DiscountTier[] = [
  { minEur: 100, percent: 10, label: '10% отстъпка над €100' },
  { minEur: 50, percent: 5, label: '5% отстъпка над €50' },
];

export const MIN_ORDER_EUR = 10;

// Връща най-високия tier, за който totalEur >= minEur
export function getDiscount(totalEur: number): DiscountTier | null {
  let best: DiscountTier | null = null;
  for (const tier of DISCOUNT_TIERS) {
    if (totalEur >= tier.minEur) {
      if (!best || tier.percent > best.percent) {
        best = tier;
      }
    }
  }
  return best;
}

// Връща следващия tier, който може да се достигне
export function getNextTier(totalEur: number): DiscountTier | null {
  for (const tier of DISCOUNT_TIERS.slice().reverse()) {
    if (totalEur < tier.minEur) return tier;
  }
  return null;
}

interface CartContextType {
  items: CartItem[];
  cartItems: CartItem[];
  savedItems: CartItem[];
  addToCart: (product: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  saveForLater: (productId: number) => void;
  moveToCart: (productId: number) => void;
  removeSaved: (productId: number) => void;
  totalItems: number;
  totalPrice: number;
  totalPriceEur: number;
  discountTier: DiscountTier | null;
  discountAmount: number;
  discountAmountEur: number;
  promoCode: PromoCodeInfo | null;
  promoDiscountAmount: number;
  promoDiscountAmountEur: number;
  applyPromoCode: (code: string) => Promise<{ success: boolean; error?: string; discount?: number }>;
  removePromoCode: () => void;
  finalPrice: number;
  finalPriceEur: number;
  getCartTotal: () => number;
  getCartCount: () => number;
  toastProduct: ToastProduct | null;
  clearToast: () => void;
  syncCartPrices: () => Promise<CartItem[]>;
  storageError: string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readCart('cart'));

  const [savedItems, setSavedItems] = useState<CartItem[]>(() => readCart('cart_saved_for_later'));
  const [storageError, setStorageError] = useState('');

  const [promoCode, setPromoCode] = useState<PromoCodeInfo | null>(() => {
    try {
      const saved = sessionStorage.getItem('promo_code');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Check if expired
      if (!parsed || typeof parsed.code !== 'string' || !Number.isFinite(parsed.discountPercent) ||
          parsed.discountPercent <= 0 || parsed.discountPercent > 100 || !Number.isFinite(Date.parse(parsed.expiresAt)) ||
          Date.parse(parsed.expiresAt) <= Date.now()) {
        sessionStorage.removeItem('promo_code');
        return null;
      }
      return parsed;
    } catch { return null; }
  });

  const [toastProduct, setToastProduct] = useState<ToastProduct | null>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const priceRevision = useRef(0);

  useEffect(() => {
    try { localStorage.setItem('cart', JSON.stringify(items)); }
    catch { setStorageError('Браузърът не може да запази количката. При затваряне на страницата тя може да се изгуби.'); }
  }, [items]);

  useEffect(() => {
    try { localStorage.setItem('cart_saved_for_later', JSON.stringify(savedItems)); } catch { /* Keep the draft in memory. */ }
  }, [savedItems]);

  useEffect(() => {
    try {
      if (promoCode) sessionStorage.setItem('promo_code', JSON.stringify(promoCode));
      else sessionStorage.removeItem('promo_code');
    } catch { /* Checkout proof writes are checked separately before redirect. */ }
    if (!promoCode) return;
    const timer = setTimeout(() => setPromoCode(null), Math.max(0, Date.parse(promoCode.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [promoCode]);

  const clearToast = useCallback(() => setToastProduct(null), []);

  // Добавя продукт в количката с опционално количество
  const addToCart = useCallback((product: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    if (!Number.isFinite(quantity) || quantity < 1 || product.in_stock === false || product.stock === 0) return;
    const qty = Math.min(100, Math.floor(quantity));
    const checked = normalizeCart([{ ...product, quantity: qty }])[0];
    if (!checked) return;
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, ...product, quantity: Math.min(100, product.stock ?? 100, item.quantity + qty) } : item
        );
      }
      return prev.length < 50 ? [...prev, checked] : prev;
    });
    setToastProduct({ name: product.name, image: product.image, price: product.price });
    // Meta Pixel: AddToCart
    trackAddToCart({
      content_ids: [String(product.id)],
      content_name: product.name,
      value: product.price * qty,
      currency: 'EUR',
      num_items: qty,
    });
  }, []);

  const removeFromCart = (productId: number) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (!Number.isFinite(quantity)) return;
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev =>
      prev.map(item => item.id === productId ? { ...item, quantity: Math.min(100, Math.floor(quantity)) } : item)
    );
  };

  const clearCart = useCallback(() => {
    setItems([]);
    setPromoCode(null);
  }, []);

  // Запази за по-късно
  const saveForLater = (productId: number) => {
    const item = items.find(i => i.id === productId);
    if (!item) return;
    setItems(prev => prev.filter(i => i.id !== productId));
    setSavedItems(prev => {
      const exists = prev.find(i => i.id === productId);
      if (exists) return prev;
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const moveToCart = (productId: number) => {
    const item = savedItems.find(i => i.id === productId);
    if (!item || item.in_stock === false || item.stock === 0) return;
    setSavedItems(prev => prev.filter(i => i.id !== productId));
    addToCart(item, 1);
  };

  const removeSaved = (productId: number) => {
    setSavedItems(prev => prev.filter(i => i.id !== productId));
  };

  // === ИЗЧИСЛЕНИЯ ===
  // Всички суми се смятат във вътрешна валута, после се конвертират в EUR
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const minor = subtotalMinor(items);
  const totalPrice = minor / 100;
  const totalPriceEur = totalPrice;

  // Отстъпка се прилага върху общата сума в евро
  const discountTier = getDiscount(totalPriceEur);

  // Ако има активен промо код — volume discount НЕ се прилага (взаимно изключващи се)
  const effectiveDiscountTier = promoCode ? null : discountTier;
  const effectiveDiscountAmountEur = effectiveDiscountTier ? (minor - discountedMinor(minor, effectiveDiscountTier.percent)) / 100 : 0;
  const effectiveDiscountAmount = effectiveDiscountAmountEur;

  // Промо код отстъпка (върху оригиналната сума, без volume discount)
  const promoDiscountAmountEur = promoCode ? (minor - discountedMinor(minor, promoCode.discountPercent)) / 100 : 0;
  const promoDiscountAmount = promoDiscountAmountEur;

  // Крайна сума = обща сума - (volume discount ИЛИ промо отстъпка, не двете)
  const finalPriceEur = discountedMinor(minor, promoCode?.discountPercent || effectiveDiscountTier?.percent || 0) / 100;
  const finalPrice = finalPriceEur;

  const applyPromoCode = async (code: string): Promise<{ success: boolean; error?: string; discount?: number }> => {
    try {
      const sessionId = sessionStorage.getItem('game_session_id');
      if (!sessionId) {
        return { success: false, error: 'Няма активна игра сесия' };
      }

      const { data, error: fnError } = await supabase.functions.invoke('validate-promo-code', {
        body: { promo_code: code, session_id: sessionId },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error || data?.valid !== true || typeof data.promo_code !== 'string' ||
          !Number.isFinite(data.discount_percent) || data.discount_percent <= 0 || data.discount_percent > 100) {
        return { success: false, error: data?.error || 'Невалиден промо код' };
      }

      setPromoCode({
        code: data.promo_code,
        discountPercent: data.discount_percent,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });

      return { success: true, discount: data.discount_percent };
    } catch (err: any) {
      console.error('Error applying promo code:', err);
      return { success: false, error: err.message || 'Грешка при прилагане на промо код' };
    }
  };

  const removePromoCode = () => {
    setPromoCode(null);
    try { sessionStorage.removeItem('promo_code'); } catch { /* Memory state is already cleared. */ }
  };

  const getCartTotal = () => totalPrice;
  const getCartCount = () => totalItems;

  const syncCartPrices = useCallback(async () => {
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return [];
    const revision = ++priceRevision.current;
    const signature = cartSignature(currentItems);
    const ids = currentItems.map(i => i.id);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, price, name, in_stock, stock, slug')
        .in('id', ids).abortSignal(AbortSignal.timeout(20000));
      if (error || !data) throw new Error('Не успяхме да проверим цените и наличностите. Опитайте отново.');
      if (revision !== priceRevision.current || signature !== cartSignature(itemsRef.current))
        throw new Error('Количката се промени по време на проверката. Проверете я отново.');
      const updated = currentItems.map(item => {
        const db = data.find((p: any) => p.id === item.id);
        if (!db) return { ...item, in_stock: false, stock: 0 };
        if (!Number.isFinite(db.price) || db.price < 0 || typeof db.name !== 'string')
          throw new Error('Цените не са потвърдени. Опитайте отново.');
        return { ...item, price: db.price, name: db.name, slug: db.slug || undefined,
          in_stock: db.in_stock === true, stock: Number.isSafeInteger(db.stock) ? db.stock : 0 };
      });
      itemsRef.current = updated;
      setItems(updated);
      return updated;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Не успяхме да проверим количката. Опитайте отново.');
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        cartItems: items,
        savedItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        saveForLater,
        moveToCart,
        removeSaved,
        totalItems,
        totalPrice,
        totalPriceEur,
        discountTier: effectiveDiscountTier,
        discountAmount: effectiveDiscountAmount,
        discountAmountEur: effectiveDiscountAmountEur,
        promoCode,
        promoDiscountAmount,
        promoDiscountAmountEur,
        applyPromoCode,
        removePromoCode,
        finalPrice,
        finalPriceEur,
        getCartTotal,
        getCartCount,
        toastProduct,
        clearToast,
        syncCartPrices,
        storageError,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
