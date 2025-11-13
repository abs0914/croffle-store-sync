
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { PurchaseOrder } from "@/types/orderManagement";
import { fetchPurchaseOrders, updatePurchaseOrder } from "@/services/orderManagement/purchaseOrderService";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { ViewPurchaseOrderDialog } from "./ViewPurchaseOrderDialog";
import { OrderList } from "@/components/shared/orderManagement";

export function PurchaseOrdersTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);

  const loadPurchaseOrders = async () => {
    if (!currentStore?.id) return;
    
    setLoading(true);
    const orders = await fetchPurchaseOrders(currentStore.id);
    setPurchaseOrders(orders);
    setLoading(false);
  };

  useEffect(() => {
    loadPurchaseOrders();
  }, [currentStore]);

  const handleApproveOrder = async (order: PurchaseOrder) => {
    await updatePurchaseOrder(order.id, {
      status: 'approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString()
    });
    loadPurchaseOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'in_progress': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const filteredOrders = purchaseOrders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Purchase Orders</CardTitle>
          <Button onClick={() => navigate('/order-management/create')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Purchase Order
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search purchase orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <OrderList
          orders={filteredOrders}
          loading={loading}
          emptyMessage={searchTerm ? 'No purchase orders found matching your search' : 'No purchase orders created yet'}
          onView={setViewingOrder}
          onApprove={handleApproveOrder}
          userRole={user?.role}
        />
      </CardContent>
      
      {viewingOrder && (
        <ViewPurchaseOrderDialog
          order={viewingOrder}
          open={!!viewingOrder}
          onOpenChange={(open) => !open && setViewingOrder(null)}
          onSuccess={loadPurchaseOrders}
        />
      )}
    </Card>
  );
}
