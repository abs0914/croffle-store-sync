
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useOptimizedDataFetch } from '@/hooks/useOptimizedDataFetch';
import { fetchUnifiedProducts, UnifiedProduct } from '@/services/product/unifiedProductService';
import { fetchCategories } from '@/services/categoryService';
import { Category } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';

interface ProductGridFilters {
  searchTerm: string;
  categoryId: string;
  activeOnly: boolean;
  inStockOnly: boolean;
}

export function useOptimizedProductGrid(storeId: string) {
  const [filters, setFilters] = useState<ProductGridFilters>({
    searchTerm: '',
    categoryId: 'all',
    activeOnly: true,
    inStockOnly: false
  });

  // Debounce search to prevent excessive filtering
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

  // Optimized products fetch
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    error: productsError
  } = useOptimizedDataFetch<UnifiedProduct[]>(
    ['unified-products', storeId],
    () => fetchUnifiedProducts(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 30 * 1000, // 30 seconds for fresh pricing
        cacheTime: 2 * 60 * 1000, // 2 minutes
      }
    }
  );

  // Optimized categories fetch
  const {
    data: categories = [],
    isLoading: isLoadingCategories
  } = useOptimizedDataFetch(
    ['categories', storeId],
    () => fetchCategories(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 5 * 60 * 1000, // 5 minutes
      }
    }
  );

  // Memoized filtered products with performance optimization
  const filteredProducts = useMemo(() => {
    if (!products.length) return [];

    let filtered = products;

    // Apply filters efficiently
    if (filters.activeOnly) {
      filtered = filtered.filter(product => product.is_active || product.isActive);
    }

    if (filters.inStockOnly) {
      filtered = filtered.filter(product => (product.stock_quantity || 0) > 0);
    }

    if (filters.categoryId !== 'all') {
      filtered = filtered.filter(product => product.category_id === filters.categoryId);
    }

    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        (product.description && product.description.toLowerCase().includes(searchLower))
      );
    }

    // Sort by name for consistent ordering
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, filters.activeOnly, filters.inStockOnly, filters.categoryId, debouncedSearchTerm]);

  // Memoized category lookup
  const getCategoryName = useCallback((categoryId: string | undefined): string => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "Uncategorized";
  }, [categories]);

  // Optimized filter update functions
  const updateSearchTerm = useCallback((searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  }, []);

  const updateCategoryFilter = useCallback((categoryId: string) => {
    setFilters(prev => ({ ...prev, categoryId }));
  }, []);

  const updateActiveFilter = useCallback((activeOnly: boolean) => {
    setFilters(prev => ({ ...prev, activeOnly }));
  }, []);

  const updateStockFilter = useCallback((inStockOnly: boolean) => {
    setFilters(prev => ({ ...prev, inStockOnly }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      categoryId: 'all',
      activeOnly: true,
      inStockOnly: false
    });
  }, []);

  // Performance metrics
  const performanceMetrics = useMemo(() => ({
    totalProducts: products.length,
    filteredProducts: filteredProducts.length,
    filterEfficiency: products.length > 0 ? filteredProducts.length / products.length : 0,
    loadingTime: Date.now() // This would be calculated properly in a real implementation
  }), [products.length, filteredProducts.length]);

  const isLoading = isLoadingProducts || isLoadingCategories;

  return {
    // Data
    products: filteredProducts,
    allProducts: products,
    categories,
    
    // Filters
    filters,
    updateSearchTerm,
    updateCategoryFilter,
    updateActiveFilter,
    updateStockFilter,
    resetFilters,
    
    // Utilities
    getCategoryName,
    
    // Loading states
    isLoading,
    isLoadingProducts,
    isLoadingCategories,
    
    // Errors
    error: productsError,
    
    // Performance
    performanceMetrics
  };
}
