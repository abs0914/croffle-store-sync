import React from 'react';
import { AdminOrderCard } from './AdminOrderCard';
import { AdminOrderListItem } from './AdminOrderListItem';
import { Spinner } from '@/components/ui/spinner';
import { Store } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminOrder } from '../types/adminTypes';

interface AdminOrdersListProps {
  orders: AdminOrder[];
  selectedOrders: string[];
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  onSelectOrder: (orderId: string) => void;
  onSelectAll: () => void;
  onRefresh: () => void;
  stores: Store[];
}

export const AdminOrdersList: React.FC<AdminOrdersListProps> = ({
  orders,
  selectedOrders,
  viewMode,
  isLoading,
  onSelectOrder,
  onSelectAll,
  onRefresh,
  stores
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading orders...</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
        <p className="text-gray-500">No orders match your current search criteria.</p>
      </div>
    );
  }

  const allSelected = selectedOrders.length === orders.length && orders.length > 0;
  const someSelected = selectedOrders.length > 0 && selectedOrders.length < orders.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          className={someSelected ? 'data-[state=checked]:bg-blue-600' : ''}
        />
        <span className="text-sm text-gray-600">
          Select all ({orders.length} orders)
        </span>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <AdminOrderCard
              key={order.id}
              order={order}
              isSelected={selectedOrders.includes(order.id)}
              onSelect={() => onSelectOrder(order.id)}
              stores={stores}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <AdminOrderListItem
              key={order.id}
              order={order}
              isSelected={selectedOrders.includes(order.id)}
              onSelect={() => onSelectOrder(order.id)}
              stores={stores}
            />
          ))}
        </div>
      )}
    </div>
  );
};
