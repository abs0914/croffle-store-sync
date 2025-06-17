
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Store } from "@/types";

interface StoreSelectorProps {
  stores: Store[];
  selectedStoreId: string;
  onStoreChange: (storeId: string) => void;
  disabled?: boolean;
}

export const StoreSelector = ({ stores, selectedStoreId, onStoreChange, disabled }: StoreSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="store-selector">Target Store</Label>
      <Select value={selectedStoreId} onValueChange={onStoreChange} disabled={disabled}>
        <SelectTrigger id="store-selector">
          <SelectValue placeholder="Select a store" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stores</SelectItem>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
