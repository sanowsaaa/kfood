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
          setRecentProducts(parsed);
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
            setRecentProducts(parsed);
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
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { recentProducts, addToRecentlyViewed, clearRecentlyViewed };
}
