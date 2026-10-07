import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { trackAddToCart } from '../utils/metaPixel';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  category?: string;
}

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
  syncCartPrices: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [savedItems, setSavedItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart_saved_for_later');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [promoCode, setPromoCode] = useState<PromoCodeInfo | null>(() => {
    try {
      const saved = sessionStorage.getItem('promo_code');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Check if expired
      if (new Date(parsed.expiresAt) < new Date()) {
        sessionStorage.removeItem('promo_code');
        return null;
      }
      return parsed;
    } catch { return null; }
  });

  const [toastProduct, setToastProduct] = useState<ToastProduct | null>(null);

  const itemsRef = useRef(items);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('cart_saved_for_later', JSON.stringify(savedItems));
  }, [savedItems]);

  useEffect(() => {
    if (promoCode) {
      sessionStorage.setItem('promo_code', JSON.stringify(promoCode));
    } else {
      sessionStorage.removeItem('promo_code');
    }
  }, [promoCode]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const clearToast = useCallback(() => setToastProduct(null), []);

  // Добавя продукт в количката с опционално количество
  const addToCart = (product: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    const qty = Math.max(1, Math.floor(quantity));
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [...prev, { ...product, quantity: qty }];
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
  };

  const removeFromCart = (productId: number) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev =>
      prev.map(item => item.id === productId ? { ...item, quantity } : item)
    );
  };

  const clearCart = () => {
    setItems([]);
    setPromoCode(null);
  };

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
    if (!item) return;
    setSavedItems(prev => prev.filter(i => i.id !== productId));
    addToCart({ id: item.id, name: item.name, price: item.price, image: item.image, category: item.category }, 1);
  };

  const removeSaved = (productId: number) => {
    setSavedItems(prev => prev.filter(i => i.id !== productId));
  };

  // === ИЗЧИСЛЕНИЯ ===
  // Всички суми се смятат във вътрешна валута, после се конвертират в EUR
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalPriceEur = totalPrice;

  // Отстъпка се прилага върху общата сума в евро
  const discountTier = getDiscount(totalPriceEur);
  const discountAmountEur = discountTier ? totalPriceEur * (discountTier.percent / 100) : 0;
  const discountAmount = discountAmountEur;

  // Ако има активен промо код — volume discount НЕ се прилага (взаимно изключващи се)
  const effectiveDiscountTier = promoCode ? null : discountTier;
  const effectiveDiscountAmountEur = effectiveDiscountTier ? totalPriceEur * (effectiveDiscountTier.percent / 100) : 0;
  const effectiveDiscountAmount = effectiveDiscountAmountEur;

  // Промо код отстъпка (върху оригиналната сума, без volume discount)
  const promoDiscountAmountEur = promoCode ? totalPriceEur * (promoCode.discountPercent / 100) : 0;
  const promoDiscountAmount = promoDiscountAmountEur;

  // Крайна сума = обща сума - (volume discount ИЛИ промо отстъпка, не двете)
  const finalPriceEur = totalPriceEur - effectiveDiscountAmountEur - promoDiscountAmountEur;
  const finalPrice = totalPrice - effectiveDiscountAmount - promoDiscountAmount;

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

      if (data?.error || !data?.valid) {
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
    sessionStorage.removeItem('promo_code');
  };

  const getCartTotal = () => totalPrice;
  const getCartCount = () => totalItems;

  const syncCartPrices = useCallback(async () => {
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return;
    const ids = currentItems.map(i => i.id);
    try {
      const { data } = await supabase
        .from('products')
        .select('id, price, name, in_stock')
        .in('id', ids);
      if (!data) return;
      setItems(prev => prev.map(item => {
        const db = data.find((p: any) => p.id === item.id);
        if (!db) return item;
        return { ...item, price: db.price, name: db.name };
      }));
    } catch {
      // Silently fail — backend validates anyway
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
