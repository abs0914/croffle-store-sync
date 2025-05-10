
import { Store } from "@/types";
import { StoreCard } from "./StoreCard";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StoresListProps {
  stores: Store[];
  filteredStores: Store[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onDeleteStore: (storeId: string) => void;
  isMobile?: boolean; // Add the isMobile prop as optional
}

export const StoresList = ({ 
  stores,
  filteredStores,
  isLoading,
  searchQuery,
  setSearchQuery,
  onDeleteStore,
  isMobile
}: StoresListProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-croffle-primary" />
      </div>
    );
  }

  if (filteredStores.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No stores found</p>
        {searchQuery.trim() !== "" && (
          <Button
            variant="link"
            className="mt-2 text-croffle-primary"
            onClick={() => setSearchQuery('')}
          >
            Clear search
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredStores.map((store) => (
        <StoreCard 
          key={store.id} 
          store={store} 
          onDelete={onDeleteStore} 
        />
      ))}
    </div>
  );
};
