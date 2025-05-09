
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/services/product/productFetch";
import { fetchCategories } from "@/services/category/categoryFetch";
import { useProductExportImport } from "@/hooks/product/useProductExportImport";
import { Product } from "@/types";
import { toast } from "sonner";

export const useProductData = (storeId: string | undefined) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  // Use TanStack Query for fetching products
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["products", storeId],
    queryFn: () => storeId ? fetchProducts(storeId) : Promise.resolve([]),
    enabled: !!storeId,
  });
  
  // Use our export/import hook
  const { 
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate 
  } = useProductExportImport(products, storeId, refetch);
  
  // Filter products based on search term and active tab
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      searchTerm === "" || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "active" && (product.is_active || product.isActive)) ||
      (activeTab === "inactive" && !(product.is_active || product.isActive)) ||
      (activeTab === "low-stock" && (product.stock_quantity < 10 || (product.stockQuantity && product.stockQuantity < 10)));
    
    return matchesSearch && matchesTab;
  });
  
  return {
    products,
    filteredProducts,
    isLoading,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate,
    refetch
  };
};
