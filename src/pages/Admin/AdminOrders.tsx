
import React, { useState } from 'react';
import { AdminOrdersHeader } from './components/AdminOrdersHeader';
import { AdminOrdersMetrics } from './components/AdminOrdersMetrics';
import { AdminOrdersList } from './components/AdminOrdersList';
import { AdminOrderBulkActions } from './components/AdminOrderBulkActions';
import { useAdminOrdersData } from './hooks/useAdminOrdersData';

export default function AdminOrders() {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  const {
    orders,
    filteredOrders,
    searchQuery,
    setSearchQuery,
    storeFilter,
    setStoreFilter,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    isLoading,
    refreshOrders,
    orderMetrics,
    stores
  } = useAdminOrdersData();

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    setSelectedOrders(
      selectedOrders.length === filteredOrders.length 
        ? [] 
        : filteredOrders.map(order => order.id)
    );
  };

  const handleBulkAction = async (action: string) => {
    console.log('Bulk action:', action, 'on orders:', selectedOrders);
    setSelectedOrders([]);
    await refreshOrders();
  };

  return (
    <div className="space-y-6">
      <AdminOrdersHeader 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        storeFilter={storeFilter}
        setStoreFilter={setStoreFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateRange={dateRange}
        setDateRange={setDateRange}
        viewMode={viewMode}
        setViewMode={setViewMode}
        stores={stores}
      />
      
      <AdminOrdersMetrics metrics={orderMetrics} />
      
      {selectedOrders.length > 0 && (
        <AdminOrderBulkActions 
          selectedCount={selectedOrders.length}
          onBulkAction={handleBulkAction}
          onClearSelection={() => setSelectedOrders([])}
        />
      )}
      
      <AdminOrdersList
        orders={filteredOrders}
        selectedOrders={selectedOrders}
        viewMode={viewMode}
        isLoading={isLoading}
        onSelectOrder={handleSelectOrder}
        onSelectAll={handleSelectAll}
        onRefresh={refreshOrders}
        stores={stores}
      />
    </div>
  );
}
