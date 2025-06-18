
import { useStore } from "@/contexts/StoreContext";

interface StoreInfoSectionProps {
  storeId: string | null;
}

export default function StoreInfoSection({ storeId }: StoreInfoSectionProps) {
  const { stores } = useStore();
  
  const currentStore = stores.find(store => store.id === storeId);
  
  if (!currentStore) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border">
        <p className="text-sm text-gray-600">No store selected</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <div className="flex items-center space-x-3">
        {currentStore.logo_url && (
          <img 
            src={currentStore.logo_url} 
            alt={`${currentStore.name} logo`}
            className="w-10 h-10 rounded-lg object-cover"
          />
        )}
        <div>
          <h3 className="font-semibold text-blue-900">{currentStore.name}</h3>
          <p className="text-sm text-blue-700">{currentStore.address}</p>
        </div>
      </div>
    </div>
  );
}
