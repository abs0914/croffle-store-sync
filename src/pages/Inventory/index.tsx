
import { useStore } from "@/contexts/StoreContext";
import { Spinner } from "@/components/ui/spinner";
import InventoryHeader from "./components/InventoryHeader";
import { SearchFilters } from "./components/SearchFilters";
import { ProductsTable } from "./components/ProductsTable";
import { useProductData } from "./hooks/useProductData";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Store, FolderPlus, Plus } from "lucide-react";
import { createDefaultCategories } from "@/services/product/createDefaultCategories";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function Inventory() {
  const { currentStore } = useStore();
  
  const {
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
  } = useProductData(currentStore?.id);

  const handleCreateDefaultCategories = async () => {
    if (!currentStore?.id) {
      toast.error("Please select a store first");
      return;
    }

    try {
      await createDefaultCategories(currentStore.id);
      toast.success("Default categories created successfully");
      refetch();
    } catch (error) {
      console.error("Error creating default categories:", error);
      toast.error("Failed to create default categories");
    }
  };
  
  // Return a consistent "no store selected" UI if no store is selected
  if (!currentStore) {
    return (
      <div className="space-y-6">
        <InventoryHeader
          title="Menu Management"
          description="Track and manage your Menu stock levels"
        />
        
        <Alert className="bg-amber-50 border-amber-200">
          <Store className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800">No store selected</AlertTitle>
          <AlertDescription className="text-amber-700">
            Please select a store from the header dropdown to view and manage menu items.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <InventoryHeader
        title="Menu Management"
        description="Track and manage your Menu stock levels"
        onExportCSV={handleExportCSV}
        onImportClick={handleImportClick}
        onDownloadTemplate={handleDownloadTemplate}
      />
      
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" onClick={handleCreateDefaultCategories}>
          <FolderPlus className="h-4 w-4 mr-2" />
          Create Default Categories
        </Button>
        
        <Link to="/inventory/product/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>
      
      <SearchFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Spinner className="h-8 w-8 text-croffle-accent" />
          <span className="ml-2 text-croffle-primary">Loading inventory...</span>
        </div>
      ) : (
        <>
          <ProductsTable products={filteredProducts} />
          <p className="text-sm text-muted-foreground mt-2">
            Showing {filteredProducts.length} products
          </p>
        </>
      )}
    </div>
  );
}
