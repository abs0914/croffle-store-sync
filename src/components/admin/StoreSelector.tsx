
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store } from 'lucide-react';

interface Store {
  id: string;
  name: string;
  address: string;
}

interface StoreSelectorProps {
  stores: Store[];
  selectedStore: string;
  onStoreChange: (storeId: string) => void;
  loading?: boolean;
  title?: string;
  description?: string;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({
  stores,
  selectedStore,
  onStoreChange,
  loading = false,
  title = "Store Selection",
  description = "Select a store to manage its recipes and products"
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 items-center">
          <Label htmlFor="store-select">Select Store:</Label>
          <Select value={selectedStore} onValueChange={onStoreChange} disabled={loading}>
            <SelectTrigger id="store-select" className="flex-1">
              <SelectValue placeholder="Select a store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Stores</SelectItem>
              {stores.map(store => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name} - {store.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
