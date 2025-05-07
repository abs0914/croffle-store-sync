
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, generateProductImportTemplate, parseProductsCSV } from "@/services/productService";
import { Product } from "@/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const useProductData = (storeId: string | undefined) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["products", storeId],
    queryFn: () => storeId ? fetchProducts(storeId) : Promise.resolve([]),
    enabled: !!storeId,
  });
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "active" && product.isActive) ||
      (activeTab === "inactive" && !product.isActive) ||
      (activeTab === "low-stock" && product.stockQuantity < 10);
    
    return matchesSearch && matchesTab;
  });
  
  const handleExportCSV = () => {
    try {
      import("@/services/productService").then(module => {
        const csvData = module.generateProductsCSV(products);
        const blob = new Blob([csvData], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.setAttribute("hidden", "");
        a.setAttribute("href", url);
        a.setAttribute("download", `products-${storeId}-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
      toast.success("Products exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export products");
    }
  };
  
  const handleImportClick = () => {
    if (!storeId) {
      toast.error("Please select a store first");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e: any) => {
          try {
            const csvData = e.target.result;
            // Parse CSV and associate with current store
            const productsToImport = parseProductsCSV(csvData, storeId);
            
            // In a real implementation, we would process the products here
            // This is a placeholder for demonstration
            console.log("Importing products for store:", storeId, productsToImport);
            toast.info(`Processing ${productsToImport.length} products for store ${storeId}`);
            
            // Refresh the products list after import
            setTimeout(() => {
              refetch();
            }, 2000);
          } catch (error) {
            console.error("Import error:", error);
            toast.error("Failed to import products");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };
  
  const handleDownloadTemplate = () => {
    try {
      const csvData = generateProductImportTemplate();
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `product-import-template.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Template downloaded successfully");
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("Failed to download template");
    }
  };

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
    handleDownloadTemplate
  };
};
