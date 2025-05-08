
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  parseInventoryStockCSV,
  generateInventoryStockCSV,
  generateInventoryStockImportTemplate
} from "@/services/inventoryStock";
import { useStore } from "@/contexts/StoreContext";

export const useInventoryStockImportExport = (stockItems: any[]) => {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  
  // Export inventory stock to CSV
  const handleExportCSV = useCallback(() => {
    try {
      const csvData = generateInventoryStockCSV(stockItems);
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `inventory-stock-${currentStore?.id}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Inventory stock exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export inventory stock");
    }
  }, [stockItems, currentStore]);

  // Import inventory stock from CSV
  const handleImportClick = useCallback(() => {
    if (!currentStore?.id) {
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
            toast.loading("Processing inventory stock import...");
            
            // Parse CSV and process items
            const importedItems = await parseInventoryStockCSV(csvData, currentStore.id);
            
            toast.dismiss();
            toast.success(`Successfully processed ${importedItems.length} inventory items`);
            
            // Refresh the inventory list
            queryClient.invalidateQueries({ queryKey: ['inventory-stock', currentStore.id] });
          } catch (error) {
            console.error("Import error:", error);
            toast.error("Failed to import inventory stock");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [currentStore, queryClient]);

  // Download CSV template
  const handleDownloadTemplate = useCallback(() => {
    try {
      const csvData = generateInventoryStockImportTemplate();
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `inventory-stock-import-template.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Template downloaded successfully");
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
};
