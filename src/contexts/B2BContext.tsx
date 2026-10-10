import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/utils/supabase';
import { lineTotal, MAX_B2B_LINES, maxPacks, packPrice, packSize, restoreB2BCart, validQuantity } from '@/utils/b2bCart';

async function callB2BAuth(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('b2b-auth', { body });
  if (error) {
    const response = (error as { context?: Response }).context;
    if (response instanceof Response) {
      try { return await response.json(); } catch { /* use the connection error below */ }
    }
    throw new Error('Временен проблем при свързване. Опитайте отново.');
  }
  return data;
}

export interface B2BProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  wholesale_price: number;
  carton_price: number;
  image: string;
  category: string;
  badge?: string;
  rating: number;
  reviews: number;
  in_stock: boolean;
  stock: number;
  weight?: string;
  volume?: string;
  sku?: string;
  slug?: string;
  moq: number;
  moq_unit: string;
  pieces_per_carton: number;
}

export interface B2BCompany {
  id: string;
  company_name: string;
  email: string;
  phone: string;
  city: string;
  business_type: string;
  status: string;
  credit_limit: number;
  created_at: string;
  user_id: string;
  address?: string;
  postal_code?: string;
  pricing_tier_id?: string | null;
}

export interface B2BCartItem {
  product: B2BProduct;
  quantity: number;
}

interface B2BContextType {
  company: B2BCompany | null;
  companyId: string;
  loading: boolean;
  sessionLoading: boolean;
  profileError: string;
  cart: B2BCartItem[];
  cartTotal: number;
  cartItemsCount: number;
  cartError: string;
  storageWarning: string;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  requestB2BActivation: (companyId: string, email: string) => Promise<{ success: boolean; error?: string; alreadyRegistered?: boolean }>;
  registerB2B: (companyId: string, email: string, password: string, code: string) => Promise<{ success: boolean; error?: string; alreadyRegistered?: boolean }>;
  loginB2B: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => void;
  calculateB2BPrice: (product: B2BProduct) => number;
  calculateCartonPrice: (product: B2BProduct) => number;
  getFinalB2BPrice: (product: B2BProduct) => number;
  getDisplayPrice: (product: B2BProduct) => number;
  getDisplayLabel: (product: B2BProduct) => string;
  addToB2BCart: (product: B2BProduct, quantity?: number) => boolean;
  addCarton: (product: B2BProduct, cartons?: number) => boolean;
  updateB2BCartQty: (productId: number, qty: number | ((current: number) => number)) => void;
  removeFromB2BCart: (productId: number) => void;
  clearB2BCart: () => void;
  refreshData: () => Promise<void>;
}

const B2BContext = createContext<B2BContextType | undefined>(undefined);

export function B2BProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<B2BCompany | null>(null);
  const [companyId, setCompanyIdState] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [cart, setCart] = useState<B2BCartItem[]>([]);
  const cartRef = useRef<B2BCartItem[]>([]);
  const [cartError, setCartError] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const replaceCart = (items: B2BCartItem[]) => { cartRef.current = items; setCart(items); };
  const verifiedCompany = useRef('');
  const generation = useRef(0);

  const refreshData = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setProfileError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = session ? await callB2BAuth({ mode: 'profile' }) : null;
      if (request !== generation.current) return;
      if (result && !result.success) throw new Error(result.error || 'Няма фирмен достъп');
      const profile = result?.company as B2BCompany | undefined;
      const nextId = profile?.id || '';
      if (verifiedCompany.current !== nextId) {
        let restored: B2BCartItem[] = [];
        let notes = '';
        try {
          const owner = localStorage.getItem('b2b_cart_owner') || localStorage.getItem('b2b_company_id');
          if (nextId && owner === nextId) restored = restoreB2BCart(localStorage.getItem('b2b_cart'));
          if (nextId) {
            notes = sessionStorage.getItem(`b2b_order_notes:${nextId}`) || '';
            if (!notes && owner === nextId) notes = sessionStorage.getItem('b2b_order_notes') || '';
          }
        } catch { /* storage failure must not sign out a valid partner */ }
        replaceCart(restored);
        setOrderNotes(notes.slice(0, 500));
        setCartError('');
      }
      verifiedCompany.current = nextId;
      setCompany(profile || null);
      setCompanyIdState(nextId);
      try {
        if (nextId) localStorage.setItem('b2b_company_id', nextId);
        else localStorage.removeItem('b2b_company_id');
      } catch { /* the verified profile remains available in memory */ }
    } catch {
      if (request === generation.current) {
        verifiedCompany.current = '';
        setProfileError('Не успяхме да заредим фирмения профил. Проверете връзката и опитайте отново.');
        setCompany(null); setCompanyIdState(''); replaceCart([]); setOrderNotes('');
      }
    } finally {
      if (request === generation.current) { setLoading(false); setSessionLoading(false); }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Defer API calls until the Auth client's session lock has been released.
      setTimeout(() => { if (alive) void refreshData(); }, 0);
    });
    void refreshData();
    return () => { alive = false; generation.current++; subscription.unsubscribe(); };
  }, [refreshData]);

  useEffect(() => {
    if (!companyId) return;
    try {
      // Write the owner first so a failed write cannot expose another firm's draft.
      if (localStorage.getItem('b2b_cart_owner') !== companyId) localStorage.removeItem('b2b_cart');
      localStorage.setItem('b2b_cart_owner', companyId);
      localStorage.setItem('b2b_cart', JSON.stringify(cart));
      sessionStorage.setItem(`b2b_order_notes:${companyId}`, orderNotes);
      sessionStorage.removeItem('b2b_order_notes');
      setStorageWarning('');
    } catch { setStorageWarning('Браузърът не запазва черновата. Количката е налична в този екран; не презареждайте страницата.'); }
  }, [cart, companyId, orderNotes]);

  const requestB2BActivation = useCallback(async (id: string, email: string) => {
    try {
      const result = await callB2BAuth({ mode: 'request_activation', companyId: id, email });
      return { success: !!result?.success, error: result?.error, alreadyRegistered: !!result?.already_registered };
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Грешка при свързване' }; }
  }, []);

  const registerB2B = useCallback(async (id: string, email: string, password: string, code: string) => {
    try {
      const result = await callB2BAuth({ mode: 'register', companyId: id, email, password, code });
      if (!result?.success) return { success: false, error: result?.error, alreadyRegistered: !!result?.already_registered };
      const { error } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
      if (error) throw error;
      await refreshData();
      return { success: true };
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Грешка при свързване' }; }
  }, [refreshData]);

  const loginB2B = useCallback(async (email: string, password: string) => {
    try {
      const result = await callB2BAuth({ mode: 'login', email, password });
      if (!result?.success) return { success: false, error: result?.error || 'Грешка при вход' };
      const { error } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
      if (error) throw error;
      await refreshData();
      return { success: true };
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Грешка при свързване' }; }
  }, [refreshData]);

  const calculateB2BPrice = useCallback((product: B2BProduct): number => {
    return packPrice(product) / packSize(product);
  }, []);

  const calculateCartonPrice = useCallback((product: B2BProduct): number => {
    return packPrice(product);
  }, []);

  const getDisplayPrice = useCallback((product: B2BProduct): number => {
    return calculateCartonPrice(product);
  }, [calculateCartonPrice]);

  const getDisplayLabel = useCallback((product: B2BProduct): string => {
    if (product.pieces_per_carton && product.pieces_per_carton > 0) {
      return `кашон (${product.pieces_per_carton} бр.)`;
    }
    return 'бр.';
  }, []);

  const getFinalB2BPrice = useCallback((product: B2BProduct): number => {
    return calculateB2BPrice(product);
  }, [calculateB2BPrice]);

  const disconnect = useCallback(async () => {
    await supabase.auth.signOut();
    setCompanyIdState('');
    setCompany(null);
    replaceCart([]); setOrderNotes(''); setCartError(''); setStorageWarning('');
    try {
      sessionStorage.removeItem(`b2b_order_notes:${verifiedCompany.current}`);
      localStorage.removeItem('b2b_company_id');
      localStorage.removeItem('b2b_cart');
      localStorage.removeItem('b2b_cart_owner');
    } catch { /* local UI is already cleared */ }
  }, []);

  const addToB2BCart = (product: B2BProduct, quantity: number = 1) => {
    const previous = cartRef.current;
    const existing = previous.find(item => item.product.id === product.id);
    const total = (existing?.quantity || 0) + quantity;
    if (!validQuantity(product, quantity) || !validQuantity(product, total)) {
      setCartError(`За „${product.name}“ въведете цели количества до ${maxPacks(product)} ${product.pieces_per_carton > 0 ? 'кашона' : 'бр.'} общо.`);
      return false;
    }
    if (!existing && previous.length >= MAX_B2B_LINES) {
      setCartError('Една поръчка може да съдържа до 50 различни продукта.'); return false;
    }
    setCartError('');
    replaceCart(existing ? previous.map(item => item.product.id === product.id ? { product, quantity: total } : item) : [...previous, { product, quantity }]);
    return true;
  };

  // Add whole cartons (MOQ = 1 carton). For carton-based products this adds
  // cartons × pieces_per_carton pieces; for piece-based products it adds pieces.
  const addCarton = (product: B2BProduct, cartons: number = 1) => {
    return addToB2BCart(product, cartons * packSize(product));
  };

  const updateB2BCartQty = (productId: number, value: number | ((current: number) => number)) => {
    const item = cartRef.current.find(item => item.product.id === productId);
    if (!item) return;
    const qty = typeof value === 'function' ? value(item.quantity) : value;
    if (!validQuantity(item.product, qty)) {
      setCartError(`Въведете цяло количество от 1 до ${maxPacks(item.product)} ${item.product.pieces_per_carton > 0 ? 'кашона' : 'бр.'}.`); return;
    }
    setCartError('');
    replaceCart(cartRef.current.map(item => item.product.id === productId ? { ...item, quantity: qty } : item));
  };

  const removeFromB2BCart = (productId: number) => {
    setCartError(''); replaceCart(cartRef.current.filter(item => item.product.id !== productId));
  };

  const clearB2BCart = () => { setCartError(''); replaceCart([]); };

  const cartTotal = cart.reduce((sum, item) => sum + Math.round(lineTotal(item.product, item.quantity) * 100), 0) / 100;
  const cartItemsCount = cart.reduce((sum, item) => {
    const piecesPerUnit = item.product.pieces_per_carton > 0 ? item.product.pieces_per_carton : 1;
    return sum + Math.round(item.quantity / piecesPerUnit);
  }, 0);

  return (
    <B2BContext.Provider value={{
      company, companyId, loading, sessionLoading, profileError, cart, cartTotal, cartItemsCount, cartError, storageWarning, orderNotes, setOrderNotes,
      requestB2BActivation, registerB2B, loginB2B, disconnect,
      calculateB2BPrice, calculateCartonPrice, getFinalB2BPrice,
      getDisplayPrice, getDisplayLabel,
      addToB2BCart, addCarton, updateB2BCartQty, removeFromB2BCart, clearB2BCart,
      refreshData,
    }}>
      {children}
    </B2BContext.Provider>
  );
}

export function useB2B() {
  const context = useContext(B2BContext);
  if (!context) throw new Error('useB2B must be used within B2BProvider');
  return context;
}
