/**
 * Unified Products Hook
 * Replaces multiple existing hooks: useProductData, useProductCatalogData, useOptimizedProductGrid
 * Provides real-time synchronized product and inventory data
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { unifiedProductInventoryService, UnifiedInventoryData, UnifiedProductData } from '@/services/unified/UnifiedProductInventoryService';
import { Category } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { priceRefreshService } from '@/services/pos/priceRefreshService';

export interface UnifiedProductFilters {
  searchTerm: string;
  categoryId: string | null;
  availabilityStatus: 'all' | 'available' | 'low_stock' | 'out_of_stock';
  activeOnly: boolean;
}

interface UseUnifiedProductsOptions {
  storeId: string | null;
  autoRefresh?: boolean;
  initialFilters?: Partial<UnifiedProductFilters>;
}

export function useUnifiedProducts({
  storeId,
  autoRefresh = true,
  initialFilters = {}
}: UseUnifiedProductsOptions) {
  // Data state
  const [data, setData] = useState<UnifiedInventoryData>({
    products: [],
    categories: [],
    totalProducts: 0,
    availableProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    lastSync: new Date().toISOString()
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  // Filter state
  const [filters, setFilters] = useState<UnifiedProductFilters>({
    searchTerm: '',
    categoryId: null,
    availabilityStatus: 'all',
    activeOnly: true,
    ...initialFilters
  });

  // Debounced search term for performance
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

  // Ref to track loading state and prevent race conditions
  const loadingRef = useRef(false);
  const lastLoadedStoreRef = useRef<string | null>(null);

  /**
   * Load unified data with proper race condition prevention
   */
  const loadData = useCallback(async () => {
    if (!storeId) {
      console.log('🚫 No storeId provided, clearing data');
      setData({
        products: [],
        categories: [],
        totalProducts: 0,
        availableProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        lastSync: new Date().toISOString()
      });
      setIsLoading(false);
      loadingRef.current = false;
      return;
    }

    // Prevent duplicate loading for same store
    if (loadingRef.current && lastLoadedStoreRef.current === storeId) {
      console.log('⏳ Already loading data for this store, skipping duplicate request');
      return;
    }

    try {
      console.log('🔄 Loading unified data for store:', storeId);
      loadingRef.current = true;
      lastLoadedStoreRef.current = storeId;
      setIsLoading(true);
      setError(null);
      
      const unifiedData = await unifiedProductInventoryService.getUnifiedData(storeId);
      
      // Validate we're still loading the same store (prevent stale data)
      if (lastLoadedStoreRef.current !== storeId) {
        console.log('⚠️ Store changed during load, discarding stale data');
        return;
      }
      
      // Early return if no products (empty data)
      if (!unifiedData.products || unifiedData.products.length === 0) {
        console.warn('⚠️ No products returned from service');
      }
      
      setData(unifiedData);
      setIsConnected(true);
      
      console.log('✅ Unified products loaded:', {
        storeId,
        totalProducts: unifiedData.totalProducts,
        availableProducts: unifiedData.availableProducts,
        productsCount: unifiedData.products.length
      });
    } catch (err) {
      console.error('❌ Error loading unified products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setIsConnected(false);
      
      // Try to use cached data
      const cached = unifiedProductInventoryService.getCachedData(storeId);
      if (cached) {
        setData(cached);
        console.log('📦 Using cached data due to error');
      }
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [storeId]);

  /**
   * Filtered and sorted products
   */
  const filteredProducts = useMemo(() => {
    let filtered = data.products;

    // Apply active filter
    if (filters.activeOnly) {
      filtered = filtered.filter(product => product.is_active);
    }

    // Apply availability filter
    if (filters.availabilityStatus !== 'all') {
      filtered = filtered.filter(product => 
        product.availability_status === filters.availabilityStatus
      );
    }

    // Apply category filter - handle "all" as null
    if (filters.categoryId && filters.categoryId !== 'all') {
      filtered = filtered.filter(product => 
        product.category_id === filters.categoryId
      );
    }

    // Apply search filter
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by display order, then by name
    return filtered.sort((a, b) => {
      const orderA = (a as any).display_order || 999;
      const orderB = (b as any).display_order || 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      return a.name.localeCompare(b.name);
    });
  }, [data.products, filters, debouncedSearchTerm]);

  /**
   * Get category name by ID
   */
  const getCategoryName = useCallback((categoryId: string | null): string => {
    if (!categoryId) return 'Uncategorized';
    const category = data.categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  }, [data.categories]);

  /**
   * Filter update functions
   */
  const updateSearchTerm = useCallback((searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  }, []);

  const updateCategoryFilter = useCallback((categoryId: string | null) => {
    setFilters(prev => ({ ...prev, categoryId }));
  }, []);

  const updateAvailabilityFilter = useCallback((availabilityStatus: UnifiedProductFilters['availabilityStatus']) => {
    setFilters(prev => ({ ...prev, availabilityStatus }));
  }, []);

  const updateActiveFilter = useCallback((activeOnly: boolean) => {
    setFilters(prev => ({ ...prev, activeOnly }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      categoryId: null,
      availabilityStatus: 'all',
      activeOnly: true,
      ...initialFilters
    });
  }, [initialFilters]);

  /**
   * Manual refresh
   */
  const refresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    loadData();
  }, [loadData]);

  /**
   * Get product by ID
   */
  const getProductById = useCallback((productId: string): UnifiedProductData | null => {
    return data.products.find(product => product.id === productId) || null;
  }, [data.products]);

  /**
   * Validate products for sale
   */
  const validateForSale = useCallback(async (
    items: Array<{ productId: string; quantity: number }>
  ) => {
    if (!storeId) {
      return { isValid: false, errors: ['No store selected'], warnings: [] };
    }
    
    return unifiedProductInventoryService.validateProductsForSale(storeId, items);
  }, [storeId]);

  // Initial data load - only trigger when storeId changes
  useEffect(() => {
    if (storeId !== lastLoadedStoreRef.current) {
      console.log('🔄 Store changed, loading data for:', storeId);
      loadData();
    }
  }, [storeId, loadData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!storeId || !autoRefresh) return;

    console.log('🔔 Setting up real-time subscriptions for unified products');

    // Subscribe to data changes
    const unsubscribeListener = unifiedProductInventoryService.addListener(
      (updatedStoreId, updatedData) => {
        if (updatedStoreId === storeId) {
          console.log('📡 Real-time data update received');
          setData(updatedData);
          setIsConnected(true);
        }
      }
    );

    // Subscribe to real-time updates
    const unsubscribeRealtime = unifiedProductInventoryService.subscribeToUpdates(storeId);

    // Subscribe to price refresh notifications from catalog
    const unsubscribePriceRefresh = priceRefreshService.addRefreshListener(() => {
      console.log('💰 Price refresh notification received, reloading POS data');
      loadData();
    });

    return () => {
      console.log('🧹 Cleaning up unified products subscriptions for store:', storeId);
      unsubscribeListener();
      unsubscribeRealtime();
      unsubscribePriceRefresh();
    };
  }, [storeId, autoRefresh, loadData]);

  return {
    // Data
    products: filteredProducts,
    allProducts: data.products,
    categories: data.categories,
    
    // Statistics
    totalProducts: data.totalProducts,
    availableProducts: data.availableProducts,
    lowStockProducts: data.lowStockProducts,
    outOfStockProducts: data.outOfStockProducts,
    filteredCount: filteredProducts.length,
    
    // State
    isLoading,
    error,
    isConnected,
    lastSync: data.lastSync,
    
    // Filters
    filters,
    updateSearchTerm,
    updateCategoryFilter,
    updateAvailabilityFilter,
    updateActiveFilter,
    resetFilters,
    
    // Utilities
    getCategoryName,
    getProductById,
    validateForSale,
    refresh
  };
}