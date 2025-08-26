
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Store {
  id: string;
  name: string;
}

interface StoreSelectorProps {
  stores: Store[];
  selectedStore: string;
  onStoreChange: (storeId: string) => void;
  title?: string;
  description?: string;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({
  stores,
  selectedStore,
  onStoreChange,
  title = "Store Selection",
  description = "Select a store to manage"
}) => {
  // Filter out stores with empty IDs or names to prevent Select.Item errors
  const validStores = stores.filter(store => 
    store && 
    store.id && 
    store.id.trim() !== '' && 
    store.name && 
    store.name.trim() !== ''
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="store-select">Store</Label>
          <Select value={selectedStore} onValueChange={onStoreChange}>
            <SelectTrigger id="store-select">
              <SelectValue placeholder="Select a store" />
            </SelectTrigger>
            <SelectContent>
              {validStores.length > 0 ? (
                validStores.map(store => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-stores" disabled>
                  No stores available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
