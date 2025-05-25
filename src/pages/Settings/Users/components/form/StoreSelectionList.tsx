
import { Label } from "@/components/ui/label";
import { Store } from "@/types/store";
import { Checkbox } from "@/components/ui/checkbox";

interface StoreSelectionListProps {
  stores: Store[];
  selectedStoreIds: string[];
  onStoreSelectionChange: (storeIds: string[]) => void;
}

export default function StoreSelectionList({
  stores,
  selectedStoreIds,
  onStoreSelectionChange
}: StoreSelectionListProps) {
  const handleStoreSelection = (storeId: string, checked: boolean) => {
    const newStoreIds = checked
      ? [...selectedStoreIds, storeId]
      : selectedStoreIds.filter(id => id !== storeId);

    onStoreSelectionChange(newStoreIds);
  };

  return (
    <div className="space-y-2">
      <Label>Assigned Stores</Label>
      <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
        {stores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stores available</p>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="flex items-center space-x-2">
              <Checkbox
                id={`store-${store.id}`}
                checked={selectedStoreIds.includes(store.id)}
                onCheckedChange={(checked) => handleStoreSelection(store.id, !!checked)}
              />
              <Label htmlFor={`store-${store.id}`} className="cursor-pointer text-sm">
                {store.name}
              </Label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
