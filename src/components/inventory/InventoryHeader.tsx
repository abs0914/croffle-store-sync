
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Package, Upload, Download, Plus } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { importProductsFromCSV, exportProductsToCSV } from "@/services/inventoryService";
import ImportProducts from "./ImportProducts";
import AddEditProduct from "./AddEditProduct";
import { toast } from "sonner";

export default function InventoryHeader() {
  const { currentStore } = useStore();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);

  const handleExport = async () => {
    if (!currentStore) return;

    try {
      const csvData = await exportProductsToCSV(currentStore.id);
      
      // Create download link
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `products-${currentStore.name}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Products exported successfully!");
    } catch (error) {
      console.error("Error exporting products:", error);
      toast.error("Failed to export products.");
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-croffle-primary flex items-center">
          <Package className="mr-2 h-6 w-6" />
          Inventory Management
        </h1>
        <p className="text-muted-foreground">
          Manage products, track stock levels, and review inventory history
        </p>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="flex items-center"
          onClick={() => setIsImportDialogOpen(true)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
        
        <Button
          variant="outline"
          className="flex items-center"
          onClick={handleExport}
          disabled={!currentStore}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        
        <Button
          className="flex items-center bg-croffle-accent hover:bg-croffle-accent/90"
          onClick={() => setIsAddProductDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
        
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <ImportProducts onClose={() => setIsImportDialogOpen(false)} />
        </Dialog>
        
        <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
          <AddEditProduct onClose={() => setIsAddProductDialogOpen(false)} />
        </Dialog>
      </div>
    </div>
  );
}
