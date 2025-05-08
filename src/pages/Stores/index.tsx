
import { useStoresData } from "./hooks/useStoresData";
import { StoresHeader } from "./components/StoresHeader";
import { StoresList } from "./components/StoresList";

export default function Stores() {
  const {
    stores,
    filteredStores,
    searchQuery,
    setSearchQuery,
    isLoading,
    handleDeleteStore
  } = useStoresData();
  
  return (
    <div className="container mx-auto py-6">
      <StoresHeader 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <StoresList 
        stores={stores}
        filteredStores={filteredStores}
        isLoading={isLoading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onDeleteStore={handleDeleteStore}
      />
    </div>
  );
}
