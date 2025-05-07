
import { useStore } from "@/contexts/StoreContext";
import { Spinner } from "@/components/ui/spinner";
import InventoryHeader from "./components/InventoryHeader";
import { SearchFilters } from "./components/SearchFilters";
import { ProductsTable } from "./components/ProductsTable";
import { useProductData } from "./hooks/useProductData";

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
  
  return (
    <div className="space-y-6">
      <InventoryHeader
        title="Inventory Stock Management"
        description="Track and manage your inventory stock levels"
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
