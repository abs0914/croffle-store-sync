/**
 * Progressive Product Loading Hook
 * Loads essential product data first (fast), then enriches with detailed data in background
 * Provides the best user experience - products appear instantly, details load progressively
 */

import { useState, useEffect, useCallback } from 'react';
import { progressiveDataLoader, EssentialProductData, DetailedProductData } from '@/services/unified/ProgressiveDataLoader';

interface UseProgressiveProductsOptions {
  storeId: string | null;
  autoLoadDetails?: boolean;
}

export function useProgressiveProducts({
  storeId,
  autoLoadDetails = true
}: UseProgressiveProductsOptions) {
  // Essential data loads fast (names, prices, images)
  const [essentialProducts, setEssentialProducts] = useState<EssentialProductData[]>([]);
  const [isLoadingEssential, setIsLoadingEssential] = useState(true);
  
  // Detailed data loads in background (inventory, recipes, availability)
  const [detailedProducts, setDetailedProducts] = useState<DetailedProductData[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsProgress, setDetailsProgress] = useState(0);
  
  // Combined state
  const [error, setError] = useState<string | null>(null);

  /**
   * Load essential data (fast!)
   */
  const loadEssential = useCallback(async () => {
    if (!storeId) {
      setEssentialProducts([]);
      setIsLoadingEssential(false);
      return;
    }

    try {
      setIsLoadingEssential(true);
      setError(null);
      
      const data = await progressiveDataLoader.loadEssentialData(storeId);
      setEssentialProducts(data);
      
      console.log('⚡ [PROGRESSIVE HOOK] Essential products loaded:', data.length);
    } catch (err) {
      console.error('❌ [PROGRESSIVE HOOK] Essential load failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setIsLoadingEssential(false);
    }
  }, [storeId]);

  /**
   * Load detailed data in background
   */
  const loadDetails = useCallback(async () => {
    if (!storeId || essentialProducts.length === 0) return;

    try {
      setIsLoadingDetails(true);
      setDetailsProgress(0);
      
      const data = await progressiveDataLoader.loadDetailedDataInBackground(
        storeId,
        essentialProducts,
        (progress, total) => {
          setDetailsProgress(Math.round((progress / total) * 100));
        }
      );
      
      setDetailedProducts(data);
      setDetailsProgress(100);
      
      console.log('✅ [PROGRESSIVE HOOK] Detailed products loaded:', data.length);
    } catch (err) {
      console.error('❌ [PROGRESSIVE HOOK] Details load failed:', err);
      // Don't set error - essential data is still usable
    } finally {
      setIsLoadingDetails(false);
    }
  }, [storeId, essentialProducts]);

  /**
   * Manual refresh
   */
  const refresh = useCallback(() => {
    if (storeId) {
      progressiveDataLoader.clearCache(storeId);
      loadEssential();
    }
  }, [storeId, loadEssential]);

  // Load essential data when store changes
  useEffect(() => {
    loadEssential();
  }, [loadEssential]);

  // Auto-load detailed data after essential data loads
  useEffect(() => {
    if (autoLoadDetails && essentialProducts.length > 0 && !isLoadingDetails && detailedProducts.length === 0) {
      loadDetails();
    }
  }, [autoLoadDetails, essentialProducts, isLoadingDetails, detailedProducts.length, loadDetails]);

  return {
    // Essential data (available immediately)
    essentialProducts,
    isLoadingEssential,
    
    // Detailed data (loads in background)
    detailedProducts,
    isLoadingDetails,
    detailsProgress,
    hasDetails: detailedProducts.length > 0,
    
    // Combined products (use detailed if available, otherwise essential)
    products: detailedProducts.length > 0 ? detailedProducts : essentialProducts,
    
    // State
    error,
    isFullyLoaded: !isLoadingEssential && !isLoadingDetails && detailedProducts.length > 0,
    
    // Actions
    loadDetails,
    refresh
  };
}
