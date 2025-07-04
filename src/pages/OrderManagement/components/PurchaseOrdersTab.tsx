
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, CheckCircle } from "lucide-react";
import { PurchaseOrder } from "@/types/orderManagement";
import { fetchPurchaseOrders, updatePurchaseOrder } from "@/services/orderManagement/purchaseOrderService";
import { useAuth } from "@/contexts/auth";
import { CreatePurchaseOrderDialog } from "./CreatePurchaseOrderDialog";
import { ViewPurchaseOrderDialog } from "./ViewPurchaseOrderDialog";

export function PurchaseOrdersTab() {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);

  const loadPurchaseOrders = async () => {
    if (!user?.storeIds?.[0]) return;
    
    setLoading(true);
    const orders = await fetchPurchaseOrders(user.storeIds[0]);
    setPurchaseOrders(orders);
    setLoading(false);
  };

  useEffect(() => {
    loadPurchaseOrders();
  }, [user]);

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
          <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
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
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? 'No purchase orders found matching your search' : 'No purchase orders created yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{order.order_number}</h3>
                      <Badge variant={getStatusColor(order.status)} className="text-xs">
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
                      <p className="text-sm text-muted-foreground">
                        Total: ₱{order.total_amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Items: {order.items?.length || 0}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingOrder(order)}
                      className="flex-1 sm:flex-none"
                    >
                      <Eye className="h-4 w-4 sm:mr-0 mr-2" />
                      <span className="sm:hidden">View</span>
                    </Button>
                    {order.status === 'pending' && (user?.role === 'admin' || user?.role === 'owner') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproveOrder(order)}
                        className="flex-1 sm:flex-none"
                      >
                        <CheckCircle className="h-4 w-4 sm:mr-0 mr-2" />
                        <span className="sm:hidden">Approve</span>
                      </Button>
                    )}
                  </div>
                </div>
                
                {order.notes && (
                  <p className="text-sm">{order.notes}</p>
                )}
                
                <div className="text-xs text-muted-foreground space-y-1 sm:space-y-0">
                  <div>Created: {new Date(order.created_at).toLocaleDateString()}</div>
                  {order.requested_delivery_date && (
                    <div className="sm:inline sm:ml-4">
                      Requested Delivery: {new Date(order.requested_delivery_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CreatePurchaseOrderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadPurchaseOrders}
      />
      
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
