
import React from 'react';
import { AdminCustomerCard } from './AdminCustomerCard';
import { AdminCustomerListItem } from './AdminCustomerListItem';
import { Spinner } from '@/components/ui/spinner';
import { Store } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';

interface CustomerWithStats {
  id: string;
  name: string;
  email?: string;
  phone: string;
  storeId?: string;
  storeName?: string;
  address?: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  registrationDate: string;
}

interface AdminCustomersListProps {
  customers: CustomerWithStats[];
  selectedCustomers: string[];
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  onSelectCustomer: (customerId: string) => void;
  onSelectAll: () => void;
  onRefresh: () => void;
  stores: Store[];
}

export const AdminCustomersList: React.FC<AdminCustomersListProps> = ({
  customers,
  selectedCustomers,
  viewMode,
  isLoading,
  onSelectCustomer,
  onSelectAll,
  onRefresh,
  stores
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading customers...</span>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
        <p className="text-gray-500">No customers match your current search criteria.</p>
      </div>
    );
  }

  const allSelected = selectedCustomers.length === customers.length && customers.length > 0;
  const someSelected = selectedCustomers.length > 0 && selectedCustomers.length < customers.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          className={someSelected ? 'data-[state=checked]:bg-blue-600' : ''}
        />
        <span className="text-sm text-gray-600">
          Select all ({customers.length} customers)
        </span>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <AdminCustomerCard
              key={customer.id}
              customer={customer}
              isSelected={selectedCustomers.includes(customer.id)}
              onSelect={() => onSelectCustomer(customer.id)}
              stores={stores}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => (
            <AdminCustomerListItem
              key={customer.id}
              customer={customer}
              isSelected={selectedCustomers.includes(customer.id)}
              onSelect={() => onSelectCustomer(customer.id)}
              stores={stores}
            />
          ))}
        </div>
      )}
    </div>
  );
};
