import { useState, useEffect, useCallback } from 'react';

interface RecentProduct {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  in_stock: boolean;
  slug?: string;
  viewedAt: number;
}

const STORAGE_KEY = 'recently_viewed';
const MAX_ITEMS = 8;
function validRecent(value: unknown): RecentProduct[] {
  if (!Array.isArray(value)) return [];
  return value.filter(p => p && Number.isSafeInteger(p.id) && p.id > 0 && typeof p.name === 'string' &&
    Number.isFinite(p.price) && p.price >= 0 && typeof p.image === 'string' && typeof p.category === 'string' &&
    Number.isFinite(p.rating) && Number.isFinite(p.reviews) && typeof p.in_stock === 'boolean' && Number.isFinite(p.viewedAt)).slice(0, MAX_ITEMS);
}

export function useRecentlyViewed() {
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate data structure
        if (Array.isArray(parsed)) {
          setRecentProducts(validRecent(parsed));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : [];
          if (Array.isArray(parsed)) {
            setRecentProducts(validRecent(parsed));
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addToRecentlyViewed = useCallback((product: Omit<RecentProduct, 'viewedAt'>) => {
    setRecentProducts(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      const updated = [{ ...product, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentProducts([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Memory state is cleared. */ }
  }, []);

  return { recentProducts, addToRecentlyViewed, clearRecentlyViewed };
}
