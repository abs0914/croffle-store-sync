
import React from 'react';
import { AdminStoreCard } from './AdminStoreCard';
import { AdminStoreListItem } from './AdminStoreListItem';
import { Spinner } from '@/components/ui/spinner';
import { Store } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';

interface AdminStoresListProps {
  stores: Store[];
  selectedStores: string[];
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  onSelectStore: (storeId: string) => void;
  onSelectAll: () => void;
  onRefresh: () => void;
}

export const AdminStoresList: React.FC<AdminStoresListProps> = ({
  stores,
  selectedStores,
  viewMode,
  isLoading,
  onSelectStore,
  onSelectAll,
  onRefresh
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading stores...</span>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
        <p className="text-gray-500">No stores match your current search criteria.</p>
      </div>
    );
  }

  const allSelected = selectedStores.length === stores.length && stores.length > 0;
  const someSelected = selectedStores.length > 0 && selectedStores.length < stores.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          className={someSelected ? 'data-[state=checked]:bg-blue-600' : ''}
        />
        <span className="text-sm text-gray-600">
          Select all ({stores.length} stores)
        </span>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <AdminStoreCard
              key={store.id}
              store={store}
              isSelected={selectedStores.includes(store.id)}
              onSelect={() => onSelectStore(store.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {stores.map((store) => (
            <AdminStoreListItem
              key={store.id}
              store={store}
              isSelected={selectedStores.includes(store.id)}
              onSelect={() => onSelectStore(store.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
