import { useState, useEffect, useMemo, useCallback } from "react";
import { Product } from "@/types";
import { Category } from "@/types/product";

interface ComboDataValidationResult {
  isDataLoaded: boolean;
  isDataReady: boolean;
  hasAnyValidProducts: boolean;
  dataError: string | null;
  retryCount: number;
  isRefreshing: boolean;
  handleRefresh: () => Promise<void>;
  resetError: () => void;
}

const CROFFLE_CATEGORIES = ["Classic", "Plain", "Fruity", "Premium", "Mini Croffle"];

export function useComboDataValidation(
  products: Product[], 
  categories: Category[]
): ComboDataValidationResult {
  const [dataError, setDataError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Enhanced data loading check with validation
  const isDataLoaded = useMemo(() => {
    const hasProducts = products && products.length > 0;
    const hasCategories = categories && categories.length > 0;
    const hasActiveProducts = products?.some(p => p.is_active);
    const hasActiveCategories = categories?.some(c => c.is_active);
    
    return hasProducts && hasCategories && hasActiveProducts && hasActiveCategories;
  }, [products, categories]);

  // Enhanced validation with retry logic - MEMOIZED for performance
  const hasAnyValidProducts = useMemo(() => {
    if (!isDataLoaded) return false;
    
    // Early return if no data
    if (!products?.length || !categories?.length) return false;
    
    const validCategories = CROFFLE_CATEGORIES.filter(catName => {
      if (catName === "Mini Croffle") {
        const hasMiniByName = products.some(p => p.name?.toLowerCase().includes("mini") && p.is_active);
        if (hasMiniByName) return true;
        
        const mixMatchCategory = categories.find(c => c.name === "Mix & Match" && c.is_active);
        return mixMatchCategory && products.some(p => p.category_id === mixMatchCategory.id && p.is_active);
      }
      const category = categories.find(c => c.name === catName && c.is_active);
      return category && products.some(p => p.category_id === category.id && p.is_active);
    });
    
    return validCategories.length > 0;
  }, [products, categories, isDataLoaded]);

  // Category products validation function - MEMOIZED with early returns
  const getCategoryProducts = useCallback((categoryName: string): Product[] => {
    // Early returns for invalid input
    if (!categoryName || !products?.length || !categories?.length) {
      return [];
    }
    
    try {
      
      // Special case for Mini Croffle with improved matching
      if (categoryName === "Mini Croffle") {
        // First try to find by name
        let miniProducts = products.filter(p => 
          p && p.name && typeof p.name === 'string' &&
          p.name.toLowerCase().includes("mini") && 
          p.is_active
        );
        
        // If no products found by name, try "Mix & Match" category
        if (miniProducts.length === 0) {
          const mixMatchCategory = categories.find(c => c && c.name === "Mix & Match" && c.is_active);
          if (mixMatchCategory && mixMatchCategory.id) {
            miniProducts = products.filter(p => 
              p && p.category_id === mixMatchCategory.id && p.is_active
            );
          }
        }
        
        return miniProducts || [];
      }
      
      // For other categories, find products with enhanced validation
      const matchingCategories = categories.filter(c => 
        c && c.name === categoryName && c.is_active && c.id
      );
      
      if (matchingCategories.length === 0) {
        return [];
      }
      
      const categoryIds = matchingCategories.map(c => c.id);
      
      // Filter products with enhanced validation
      const categoryProducts = products.filter(p => 
        p && p.category_id && categoryIds.includes(p.category_id) && p.is_active
      );
      
      return categoryProducts || [];
    } catch (error) {
      console.error(`Error in getCategoryProducts for "${categoryName}":`, error);
      return [];
    }
  }, [products, categories]);

  // Data readiness check with retry mechanism - OPTIMIZED with early returns
  useEffect(() => {
    // Early return if data not loaded
    if (!isDataLoaded || !hasAnyValidProducts) {
      if (isDataReady) setIsDataReady(false);
      return;
    }

    // Skip if already ready
    if (isDataReady && retryCount === 0) return;

    // Validate that we can get products for at least one category
    const canGetProducts = CROFFLE_CATEGORIES.some(catName => {
      try {
        const categoryProducts = getCategoryProducts(catName);
        return categoryProducts.length > 0;
      } catch (error) {
        return false;
      }
    });

    if (canGetProducts) {
      setIsDataReady(true);
      setDataError(null);
      if (retryCount !== 0) setRetryCount(0);
    } else {
      setIsDataReady(false);
      if (retryCount < 3) {
        const timeout = setTimeout(() => setRetryCount(prev => prev + 1), 1000);
        return () => clearTimeout(timeout);
      } else if (!dataError) {
        setDataError("Unable to load product data after multiple attempts");
      }
    }
  }, [isDataLoaded, hasAnyValidProducts, retryCount, getCategoryProducts, isDataReady, dataError]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setDataError(null);
    setRetryCount(0);
    setIsDataReady(false);
    
    try {
      // Give some time for data to refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force re-evaluation of data
      if (!hasAnyValidProducts) {
        setDataError("No croffle products available. Please check your product catalog.");
      }
    } catch (error) {
      setDataError("Failed to refresh data. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }, [hasAnyValidProducts]);

  const resetError = useCallback(() => {
    setDataError(null);
    setIsRefreshing(false);
    setRetryCount(0);
  }, []);

  return {
    isDataLoaded,
    isDataReady,
    hasAnyValidProducts,
    dataError,
    retryCount,
    isRefreshing,
    handleRefresh,
    resetError
  };
}