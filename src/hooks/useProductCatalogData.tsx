
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
  
  // Further filter products based on active tab AND availability status
  const filteredProducts = categoryFilteredProducts.filter(product => {
    // Enhanced ingredient-based availability checking
    const isIngredientAvailable = product.product_status !== 'out_of_stock' && 
                                  product.product_status !== 'temporarily_unavailable' &&
                                  (product.is_available !== false); // Respect is_available field from automatic service
    
    // Enhanced tab filtering with recipe-based logic
    switch (activeTab) {
      case "active":
        return (product.is_active || product.isActive) && isIngredientAvailable;
      case "inactive":
        return !(product.is_active || product.isActive) || !isIngredientAvailable;
      case "low-stock":
        return (product.stock_quantity || product.stockQuantity || 0) <= 10 || !isIngredientAvailable;
      case "setup-needed":
        // Show products that need recipe setup
        return product.product_status === 'temporarily_unavailable' && 
               (!product.recipe_id || product.recipe_id === null);
      default:
        return true; // Show all products by default, let user filter as needed
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
    allProducts: products, // Original unfiltered products
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
