
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  parseProductsCSV,
  generateProductsCSV,
  generateProductImportTemplate
} from "@/services/productService";
import { useStore } from "@/contexts/StoreContext";

export function useProductExportImport(products: any[], storeId: string | null, refetch?: () => void) {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  
  // Export inventory stock to CSV
  const handleExportCSV = useCallback(() => {
    if (!storeId) {
      toast.error("Please select a store first");
      return;
    }
    
    try {
      const csvData = generateProductsCSV(products);
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `products-${currentStore?.id}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Products exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export products");
    }
  }, [products, storeId, currentStore]);

  // Import inventory stock from CSV
  const handleImportClick = useCallback(() => {
    if (!storeId) {
      toast.error("Please select a store first");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e: any) => {
          try {
            const csvData = e.target.result;
            console.info("CSV data to import:", csvData);
            toast.loading("Processing product import...");
            
            // Parse CSV and process items
            const importedItems = await parseProductsCSV(csvData, storeId);
            
            toast.dismiss();
            toast.success(`Successfully processed ${importedItems.length} products`);
            
            // Refresh the product list
            queryClient.invalidateQueries({ queryKey: ['products', storeId] });
            if (refetch) {
              refetch();
            }
          } catch (error) {
            console.error("Import error:", error);
            toast.error("Failed to import products");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [storeId, queryClient, refetch]);

  // Download CSV template
  const handleDownloadTemplate = useCallback(() => {
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
      toast.success("Product import template downloaded");
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("Failed to download template");
    }
  }, []);

  return {
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate
  };
}
