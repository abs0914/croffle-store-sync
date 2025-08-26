/**
 * Unified Products Hook
 * Replaces multiple existing hooks: useProductData, useProductCatalogData, useOptimizedProductGrid
 * Provides real-time synchronized product and inventory data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { unifiedProductInventoryService, UnifiedInventoryData, UnifiedProductData } from '@/services/unified/UnifiedProductInventoryService';
import { Category } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';

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

  /**
   * Load unified data
   */
  const loadData = useCallback(async () => {
    if (!storeId) {
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
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const unifiedData = await unifiedProductInventoryService.getUnifiedData(storeId);
      setData(unifiedData);
      setIsConnected(true);
      
      console.log('✅ Unified products loaded:', {
        storeId,
        totalProducts: unifiedData.totalProducts,
        availableProducts: unifiedData.availableProducts
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

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

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

    return () => {
      console.log('🧹 Cleaning up unified products subscriptions');
      unsubscribeListener();
      unsubscribeRealtime();
    };
  }, [storeId, autoRefresh]);

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