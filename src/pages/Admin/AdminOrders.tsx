
import React, { useState } from 'react';
import { AdminPurchaseOrdersHeader } from './components/AdminPurchaseOrdersHeader';
import { AdminPurchaseOrdersMetrics } from './components/AdminPurchaseOrdersMetrics';
import { AdminPurchaseOrdersList } from './components/AdminPurchaseOrdersList';
import { AdminPurchaseOrderBulkActions } from './components/AdminPurchaseOrderBulkActions';
import { useAdminPurchaseOrdersData } from './hooks/useAdminPurchaseOrdersData';
import { ViewPurchaseOrderDialog } from '@/pages/OrderManagement/components/ViewPurchaseOrderDialog';
import { PurchaseOrder } from '@/types/orderManagement';
import { updatePurchaseOrder } from '@/services/orderManagement/purchaseOrderService';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

export default function AdminOrders() {
  const { user } = useAuth();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  
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
    stores,
    bulkApproveOrders
  } = useAdminPurchaseOrdersData();

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
    if (action === 'approve') {
      await bulkApproveOrders(selectedOrders);
    } else if (action === 'reject') {
      try {
        const promises = selectedOrders.map(orderId =>
          updatePurchaseOrder(orderId, { 
            status: 'cancelled',
            approved_by: user?.id
          })
        );
        await Promise.all(promises);
        toast.success(`Rejected ${selectedOrders.length} orders`);
        await refreshOrders();
      } catch (error) {
        toast.error('Failed to reject orders');
      }
    }
    setSelectedOrders([]);
  };

  const handleApproveOrder = async (orderId: string) => {
    await updatePurchaseOrder(orderId, {
      status: 'approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString()
    });
    await refreshOrders();
  };

  const handleRejectOrder = async (orderId: string) => {
    await updatePurchaseOrder(orderId, {
      status: 'cancelled',
      approved_by: user?.id
    });
    await refreshOrders();
  };

  return (
    <div className="space-y-6">
      <AdminPurchaseOrdersHeader 
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
      
      <AdminPurchaseOrdersMetrics metrics={orderMetrics} />
      
      {selectedOrders.length > 0 && (
        <AdminPurchaseOrderBulkActions 
          selectedCount={selectedOrders.length}
          onBulkAction={handleBulkAction}
          onClearSelection={() => setSelectedOrders([])}
        />
      )}
      
      <AdminPurchaseOrdersList
        orders={filteredOrders}
        selectedOrders={selectedOrders}
        viewMode={viewMode}
        isLoading={isLoading}
        onSelectOrder={handleSelectOrder}
        onSelectAll={handleSelectAll}
        onRefresh={refreshOrders}
        onViewOrder={setViewingOrder}
        onApproveOrder={handleApproveOrder}
        onRejectOrder={handleRejectOrder}
        stores={stores}
      />

      {viewingOrder && (
        <ViewPurchaseOrderDialog
          order={viewingOrder}
          open={!!viewingOrder}
          onOpenChange={(open) => !open && setViewingOrder(null)}
          onSuccess={refreshOrders}
        />
      )}
    </div>
  );
}
