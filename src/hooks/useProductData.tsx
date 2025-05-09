
import { useProductFetch } from "./product/useProductFetch";
import { useProductFilters } from "./product/useProductFilters";
import { useProductExportImport } from "./product/useProductExportImport";
import { useCallback } from "react";

export function useProductData(storeId: string | null) {
  // Fetch base product data
  const { products, categories, isLoading, error } = useProductFetch(storeId);
  
  // Filter functionality
  const { 
    searchTerm, 
    setSearchTerm, 
    activeCategory, 
    setActiveCategory, 
    filteredProducts 
  } = useProductFilters(products);
  
  // Manual refetch function
  const refetch = useCallback(async () => {
    // This is a placeholder - the useProductFetch will handle the actual refetch
    // based on the storeId dependency
  }, []);
  
  // Export/Import functionality
  const { 
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate 
  } = useProductExportImport(products, storeId, refetch);

  return { 
    products, 
    categories, 
    filteredProducts,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    activeCategory,
    setActiveCategory,
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate,
    refetch
  };
}
