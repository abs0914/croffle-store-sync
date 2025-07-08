
import { useProductCatalogFetch } from "./product/useProductCatalogFetch";
import { useProductFilters } from "./product/useProductFilters";
import { useCallback, useState } from "react";

export function useProductCatalogData(storeId: string | null) {
  // Fetch base product data from product_catalog
  const { products, categories, isLoading, error, lastSync, isConnected, refetch } = useProductCatalogFetch(storeId);
  
  // Filter functionality with search term and category filter
  const { 
    searchTerm, 
    setSearchTerm, 
    activeCategory, 
    setActiveCategory, 
    filteredProducts: categoryFilteredProducts 
  } = useProductFilters(products);
  
  // Tab filtering (active, inactive, low-stock)
  const [activeTab, setActiveTab] = useState("all");
  
  // Further filter products based on active tab
  const filteredProducts = categoryFilteredProducts.filter(product => {
    switch (activeTab) {
      case "active":
        return product.is_active || product.isActive;
      case "inactive":
        return !(product.is_active || product.isActive);
      case "low-stock":
        return (product.stock_quantity || product.stockQuantity || 0) <= 10;
      default:
        return true;
    }
  });
  
  // Manual refetch function
  const manualRefetch = useCallback(async () => {
    // This is a placeholder - the useProductCatalogFetch will handle the actual refetch
    // based on the storeId dependency
    return refetch();
  }, [refetch]);

  return {
    products: filteredProducts,
    categories,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    activeCategory,
    setActiveCategory,
    activeTab,
    setActiveTab,
    lastSync,
    isConnected,
    refetch: manualRefetch
  };
}
