
import React, { useState } from 'react';
import { AdminCustomersHeader } from './components/AdminCustomersHeader';
import { AdminCustomersMetrics } from './components/AdminCustomersMetrics';
import { AdminCustomersList } from './components/AdminCustomersList';
import { AdminCustomerBulkActions } from './components/AdminCustomerBulkActions';
import { useAdminCustomersData } from './hooks/useAdminCustomersData';

export default function AdminCustomers() {
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  const {
    customers,
    filteredCustomers,
    searchQuery,
    setSearchQuery,
    storeFilter,
    setStoreFilter,
    statusFilter,
    setStatusFilter,
    isLoading,
    refreshCustomers,
    customerMetrics,
    stores
  } = useAdminCustomersData();

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    setSelectedCustomers(
      selectedCustomers.length === filteredCustomers.length 
        ? [] 
        : filteredCustomers.map(customer => customer.id)
    );
  };

  const handleBulkAction = async (action: string) => {
    console.log('Bulk action:', action, 'on customers:', selectedCustomers);
    setSelectedCustomers([]);
    await refreshCustomers();
  };

  return (
    <div className="space-y-6">
      <AdminCustomersHeader 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        storeFilter={storeFilter}
        setStoreFilter={setStoreFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        stores={stores}
      />
      
      <AdminCustomersMetrics metrics={customerMetrics} />
      
      {selectedCustomers.length > 0 && (
        <AdminCustomerBulkActions 
          selectedCount={selectedCustomers.length}
          onBulkAction={handleBulkAction}
          onClearSelection={() => setSelectedCustomers([])}
        />
      )}
      
      <AdminCustomersList
        customers={filteredCustomers}
        selectedCustomers={selectedCustomers}
        viewMode={viewMode}
        isLoading={isLoading}
        onSelectCustomer={handleSelectCustomer}
        onSelectAll={handleSelectAll}
        onRefresh={refreshCustomers}
        stores={stores}
      />
    </div>
  );
}
