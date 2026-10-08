import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/utils/supabase';

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
  cart: B2BCartItem[];
  cartTotal: number;
  cartItemsCount: number;
  requestB2BActivation: (companyId: string, email: string) => Promise<{ success: boolean; error?: string; alreadyRegistered?: boolean }>;
  registerB2B: (companyId: string, email: string, password: string, code: string) => Promise<{ success: boolean; error?: string; alreadyRegistered?: boolean }>;
  loginB2B: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => void;
  calculateB2BPrice: (product: B2BProduct) => number;
  calculateCartonPrice: (product: B2BProduct) => number;
  getFinalB2BPrice: (product: B2BProduct) => number;
  getDisplayPrice: (product: B2BProduct) => number;
  getDisplayLabel: (product: B2BProduct) => string;
  addToB2BCart: (product: B2BProduct, quantity?: number) => void;
  addCarton: (product: B2BProduct, cartons?: number) => void;
  updateB2BCartQty: (productId: number, qty: number) => void;
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
  const [cart, setCart] = useState<B2BCartItem[]>([]);
  const verifiedCompany = useRef('');
  const generation = useRef(0);

  const refreshData = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = session ? await callB2BAuth({ mode: 'profile' }) : null;
      if (request !== generation.current) return;
      if (result && !result.success) throw new Error(result.error || 'Няма фирмен достъп');
      const profile = result?.company as B2BCompany | undefined;
      const nextId = profile?.id || '';
      if (verifiedCompany.current !== nextId) {
        const owner = localStorage.getItem('b2b_cart_owner') || localStorage.getItem('b2b_company_id');
        let restored: B2BCartItem[] = [];
        if (nextId && owner === nextId) {
          try {
            const parsed = JSON.parse(localStorage.getItem('b2b_cart') || '[]');
            if (Array.isArray(parsed)) restored = parsed.filter(item => item?.product && Number.isSafeInteger(item.product.id) &&
              Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10000).slice(0, 50).map(item => ({
                ...item, product: Object.fromEntries(Object.entries(item.product).filter(([key]) => key !== 'cost_price')),
              })) as B2BCartItem[];
          } catch { /* an invalid saved cart starts empty */ }
        }
        setCart(restored);
      }
      verifiedCompany.current = nextId;
      setCompany(profile || null);
      setCompanyIdState(nextId);
      if (nextId) localStorage.setItem('b2b_company_id', nextId);
      else localStorage.removeItem('b2b_company_id');
    } catch {
      if (request === generation.current) {
        verifiedCompany.current = '';
        setCompany(null); setCompanyIdState(''); setCart([]);
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
    localStorage.setItem('b2b_cart', JSON.stringify(cart));
    localStorage.setItem('b2b_cart_owner', companyId);
  }, [cart, companyId]);

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
    const cartonBase = product.carton_price || product.wholesale_price || product.price || 0;
    if (product.pieces_per_carton && product.pieces_per_carton > 0) {
      return cartonBase / product.pieces_per_carton;
    }
    return product.wholesale_price || product.price || 0;
  }, []);

  const calculateCartonPrice = useCallback((product: B2BProduct): number => {
    return product.carton_price || product.wholesale_price || product.price || 0;
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
    setCart([]);
    localStorage.removeItem('b2b_company_id');
    localStorage.removeItem('b2b_cart');
    localStorage.removeItem('b2b_cart_owner');
  }, []);

  const addToB2BCart = (product: B2BProduct, quantity: number = 1) => {
    const qty = Math.max(1, Math.floor(quantity));
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  // Add whole cartons (MOQ = 1 carton). For carton-based products this adds
  // cartons × pieces_per_carton pieces; for piece-based products it adds pieces.
  const addCarton = (product: B2BProduct, cartons: number = 1) => {
    const piecesPerUnit = product.pieces_per_carton > 0 ? product.pieces_per_carton : 1;
    addToB2BCart(product, Math.max(1, Math.floor(cartons)) * piecesPerUnit);
  };

  const updateB2BCartQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, quantity: qty }
        : item
    ));
  };

  const removeFromB2BCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearB2BCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + calculateB2BPrice(item.product) * item.quantity, 0);
  const cartItemsCount = cart.reduce((sum, item) => {
    const piecesPerUnit = item.product.pieces_per_carton > 0 ? item.product.pieces_per_carton : 1;
    return sum + Math.round(item.quantity / piecesPerUnit);
  }, 0);

  return (
    <B2BContext.Provider value={{
      company, companyId, loading, sessionLoading, cart, cartTotal, cartItemsCount,
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
