import React, { useState } from 'react';
import { AdminPurchaseOrdersHeader } from './components/AdminPurchaseOrdersHeader';
import { AdminPurchaseOrdersMetrics } from './components/AdminPurchaseOrdersMetrics';
import { AdminPurchaseOrdersList } from './components/AdminPurchaseOrdersList';
import { AdminPurchaseOrderBulkActions } from './components/AdminPurchaseOrderBulkActions';
import { AdminDiscrepancyResolutions } from './components/AdminDiscrepancyResolutions';
import { useAdminPurchaseOrdersData } from './hooks/useAdminPurchaseOrdersData';
import { ViewPurchaseOrderDialog } from '@/pages/OrderManagement/components/ViewPurchaseOrderDialog';
import { CreatePurchaseOrderDialog } from '@/pages/OrderManagement/components/CreatePurchaseOrderDialog';
import { PurchaseOrder } from '@/types/orderManagement';
import { updatePurchaseOrder, fulfillPurchaseOrder, deliverPurchaseOrder, deletePurchaseOrder } from '@/services/orderManagement/purchaseOrderService';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus, Globe, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminOrders() {
  console.log('🔵 AdminOrders component mounting/rendering');
  
  const { user } = useAuth();
  console.log('🔵 AdminOrders user:', user?.email, 'role:', user?.role);
  
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [fulfillDialog, setFulfillDialog] = useState<{ orderId: string; isOpen: boolean }>({ orderId: '', isOpen: false });
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  
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

  console.log('🔵 AdminOrders hook data:', {
    ordersCount: orders.length,
    filteredOrdersCount: filteredOrders.length,
    storesCount: stores.length,
    isLoading,
    dateRange,
    storeFilter,
    statusFilter
  });

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
    } else if (action === 'delete') {
      try {
        const promises = selectedOrders.map(orderId => deletePurchaseOrder(orderId));
        await Promise.all(promises);
        toast.success(`Deleted ${selectedOrders.length} orders`);
        await refreshOrders();
      } catch (error) {
        toast.error('Failed to delete orders');
      }
    }
    setSelectedOrders([]);
  };

  const handleApproveOrder = async (orderId: string) => {
    const success = await updatePurchaseOrder(orderId, {
      status: 'approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString()
    });
    
    if (success) {
      await refreshOrders();
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const success = await updatePurchaseOrder(orderId, {
      status: 'cancelled',
      approved_by: user?.id
    });
    
    if (success) {
      await refreshOrders();
    }
  };

  const handleFulfillOrder = (orderId: string) => {
    setFulfillDialog({ orderId, isOpen: true });
    setDeliveryDate('');
    setDeliveryNotes('');
  };

  const handleFulfillSubmit = async () => {
    if (!fulfillDialog.orderId || !user?.id) return;
    
    const success = await fulfillPurchaseOrder(
      fulfillDialog.orderId,
      user.id,
      deliveryDate || undefined,
      deliveryNotes || undefined
    );
    
    if (success) {
      setFulfillDialog({ orderId: '', isOpen: false });
      await refreshOrders();
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    const success = await deliverPurchaseOrder(orderId, 'Order delivered successfully');
    
    if (success) {
      await refreshOrders();
    }
  };

  console.log('AdminOrders render:', {
    totalOrders: orders.length,
    filteredOrders: filteredOrders.length,
    stores: stores.length,
    isLoading
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-6 w-6 text-blue-600" />
            <h1 className="text-3xl font-bold">Order Management Hub</h1>
          </div>
          <p className="text-muted-foreground">
            Review, approve, and fulfill purchase orders from all stores
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshOrders}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Purchase Order
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">All Orders</TabsTrigger>
          <TabsTrigger value="discrepancies">Order Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
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
            onFulfillOrder={handleFulfillOrder}
            onDeliverOrder={handleDeliverOrder}
            stores={stores}
          />
        </TabsContent>

        <TabsContent value="discrepancies">
          <AdminDiscrepancyResolutions />
        </TabsContent>
      </Tabs>

      {viewingOrder && (
        <ViewPurchaseOrderDialog
          order={viewingOrder}
          open={!!viewingOrder}
          onOpenChange={(open) => !open && setViewingOrder(null)}
          onSuccess={refreshOrders}
        />
      )}

      <CreatePurchaseOrderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={refreshOrders}
      />

      <Dialog open={fulfillDialog.isOpen} onOpenChange={(open) => setFulfillDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fulfill Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deliveryDate">Scheduled Delivery Date (Optional)</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="deliveryNotes">Delivery Notes (Optional)</Label>
              <Textarea
                id="deliveryNotes"
                placeholder="Enter any delivery instructions or notes..."
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillDialog({ orderId: '', isOpen: false })}>
              Cancel
            </Button>
            <Button onClick={handleFulfillSubmit}>
              Fulfill Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
