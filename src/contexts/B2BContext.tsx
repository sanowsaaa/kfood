import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabase';

const B2B_AUTH_URL = 'https://quqlovoiwgqfmgjumpgd.supabase.co/functions/v1/b2b-auth';
const CHECK_USER_URL = 'https://quqlovoiwgqfmgjumpgd.supabase.co/functions/v1/check-user';



export interface B2BProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  wholesale_price: number;
  carton_price: number;
  cost_price: number;
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
  registerB2B: (companyId: string, email: string, password: string) => Promise<{ success: boolean; error?: string; alreadyRegistered?: boolean }>;
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
  const [companyId, setCompanyIdState] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [cart, setCart] = useState<B2BCartItem[]>(() => {
    try {
      const saved = localStorage.getItem('b2b_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('b2b_cart', JSON.stringify(cart));
  }, [cart]);

  // ===== Verify Supabase session on mount =====
  useEffect(() => {
    const verifySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          localStorage.removeItem('b2b_company_id');
          setCompanyIdState('');
          setSessionLoading(false);
          setSessionChecked(true);
          return;
        }

        const response = await fetch(CHECK_USER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          localStorage.removeItem('b2b_company_id');
          setCompanyIdState('');
          setSessionLoading(false);
          setSessionChecked(true);
          return;
        }

        const result = await response.json();

        if (result.isAdmin) {
          setSessionLoading(false);
          setSessionChecked(true);
          return;
        }

        if (!result.companyId) {
          localStorage.removeItem('b2b_company_id');
          setCompanyIdState('');
          setSessionLoading(false);
          setSessionChecked(true);
          return;
        }

        localStorage.setItem('b2b_company_id', result.companyId);
        setCompanyIdState(result.companyId);
        setSessionLoading(false);
        setSessionChecked(true);
      } catch {
        setSessionLoading(false);
        setSessionChecked(true);
      }
    };

    verifySession();
  }, []);

  // ===== REGISTER — one time only =====
  const registerB2B = useCallback(async (companyId: string, email: string, password: string) => {
    try {
      const response = await fetch(B2B_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'register', companyId, email, password }),
      });

      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Грешка при регистрация',
          alreadyRegistered: result.already_registered || false,
        };
      }

      await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      localStorage.setItem('b2b_company_id', result.company_id);
      setCompanyIdState(result.company_id);
      setSessionChecked(true);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Грешка при свързване' };
    }
  }, []);

  // ===== LOGIN — email + password only =====
  const loginB2B = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(B2B_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'login', email, password }),
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || 'Грешка при вход' };
      }

      await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      localStorage.setItem('b2b_company_id', result.company_id);
      setCompanyIdState(result.company_id);
      setSessionChecked(true);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Грешка при свързване' };
    }
  }, []);

  // Unit (per-piece) wholesale price — used for cart totals.
  // This formula MUST match the server (create-b2b-checkout) exactly, so the
  // cart and the stored order always show the same amount. Carton products use
  // carton_price (fallback wholesale, fallback retail) divided by pieces; piece
  // products use wholesale_price (fallback retail).
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

  const refreshData = useCallback(async () => {
    const currentCompanyId = localStorage.getItem('b2b_company_id') || companyId;
    if (!currentCompanyId) return;
    setLoading(true);
    try {
      const { data: compData } = await supabase.from('b2b_companies').select('*').eq('id', currentCompanyId).single();
      if (compData) {
        setCompany(compData);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => {
    if (companyId && sessionChecked) refreshData();
  }, [companyId, sessionChecked]);

  const disconnect = useCallback(async () => {
    await supabase.auth.signOut();
    setCompanyIdState('');
    setCompany(null);
    setCart([]);
    localStorage.removeItem('b2b_company_id');
    localStorage.removeItem('b2b_cart');
    setSessionChecked(false);
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
      registerB2B, loginB2B, disconnect,
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