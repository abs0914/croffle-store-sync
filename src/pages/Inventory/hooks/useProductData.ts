
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, generateProductImportTemplate } from "@/services/productService";
import { Product } from "@/types";
import { toast } from "sonner";

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
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e: any) => {
          try {
            toast.info("CSV import is a placeholder - full implementation would process the data");
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
