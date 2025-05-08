
import { useStore } from "@/contexts/StoreContext";
import { Spinner } from "@/components/ui/spinner";
import InventoryHeader from "./components/InventoryHeader";
import { SearchFilters } from "./components/SearchFilters";
import { ProductsTable } from "./components/ProductsTable";
import { useProductData } from "./hooks/useProductData";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Store } from "lucide-react";

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
    handleDownloadTemplate
  } = useProductData(currentStore?.id);
  
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
