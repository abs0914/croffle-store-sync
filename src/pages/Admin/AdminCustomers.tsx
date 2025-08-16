
import React, { useState } from 'react';
import { AdminCustomersHeader } from './components/AdminCustomersHeader';
import { AdminCustomersMetrics } from './components/AdminCustomersMetrics';
import { AdminCustomersList } from './components/AdminCustomersList';
import { AdminCustomerBulkActions } from './components/AdminCustomerBulkActions';
import { EditCustomerDialog } from './components/EditCustomerDialog';
import { DeleteCustomerDialog } from './components/DeleteCustomerDialog';
import { CustomerDetailsDialog } from './components/CustomerDetailsDialog';
import { useAdminCustomersData } from './hooks/useAdminCustomersData';
import { CustomerWithStats } from './types/adminTypes';

export default function AdminCustomers() {
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Dialog states
  const [editCustomer, setEditCustomer] = useState<CustomerWithStats | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<CustomerWithStats | null>(null);
  const [viewCustomer, setViewCustomer] = useState<CustomerWithStats | null>(null);
  
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

  const handleViewDetails = (customer: CustomerWithStats) => {
    setViewCustomer(customer);
  };

  const handleEditCustomer = (customer: CustomerWithStats) => {
    setEditCustomer(customer);
  };

  const handleDeleteCustomer = (customer: CustomerWithStats) => {
    setDeleteCustomer(customer);
  };

  const handleCustomerUpdated = () => {
    refreshCustomers();
    setSelectedCustomers([]);
  };

  const handleExport = () => {
    // Create CSV content
    const csvHeaders = ['Name', 'Phone', 'Email', 'Store', 'Total Orders', 'Total Spent', 'Loyalty Points', 'Created Date'];
    const csvRows = filteredCustomers.map(customer => [
      customer.name,
      customer.phone,
      customer.email || '',
      customer.storeName || '',
      customer.totalOrders.toString(),
      customer.totalSpent.toFixed(2),
      customer.loyaltyPoints.toString(),
      new Date(customer.registrationDate).toLocaleDateString()
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        onExport={handleExport}
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
        onViewDetails={handleViewDetails}
        onEditCustomer={handleEditCustomer}
        onDeleteCustomer={handleDeleteCustomer}
      />

      {/* Customer Details Dialog */}
      <CustomerDetailsDialog
        customer={viewCustomer}
        isOpen={!!viewCustomer}
        onOpenChange={(open) => !open && setViewCustomer(null)}
        stores={stores}
      />

      {/* Edit Customer Dialog */}
      <EditCustomerDialog
        customer={editCustomer}
        isOpen={!!editCustomer}
        onOpenChange={(open) => !open && setEditCustomer(null)}
        onCustomerUpdated={handleCustomerUpdated}
        onCustomerDeleted={handleCustomerUpdated}
        stores={stores}
      />

      {/* Delete Customer Dialog */}
      <DeleteCustomerDialog
        customer={deleteCustomer}
        isOpen={!!deleteCustomer}
        onOpenChange={(open) => !open && setDeleteCustomer(null)}
        onCustomerDeleted={handleCustomerUpdated}
      />
    </div>
  );
}
