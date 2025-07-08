
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PurchaseOrder } from "@/types/orderManagement";
import { updatePurchaseOrder, deletePurchaseOrderItem } from "@/services/orderManagement/purchaseOrderService";
import { useAuth } from "@/contexts/auth";
import { CheckCircle, XCircle, Package, Trash2 } from "lucide-react";
import { useState } from "react";

interface ViewPurchaseOrderDialogProps {
  order: PurchaseOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ViewPurchaseOrderDialog({
  order,
  open,
  onOpenChange,
  onSuccess
}: ViewPurchaseOrderDialogProps) {
  const { user, hasPermission } = useAuth();
  const [deletingItem, setDeletingItem] = useState<string | null>(null);

  const handleApprove = async () => {
    const success = await updatePurchaseOrder(order.id, {
      status: 'approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString()
    });
    
    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleReject = async () => {
    const success = await updatePurchaseOrder(order.id, {
      status: 'cancelled'
    });
    
    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeletingItem(itemId);
    try {
      const success = await deletePurchaseOrderItem(itemId);
      if (success) {
        onSuccess(); // Refresh the order data
      }
    } finally {
      setDeletingItem(null);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Order {order.order_number}
            </DialogTitle>
            <Badge variant={getStatusColor(order.status)}>
              {order.status.replace('_', ' ')}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-semibold">₱{order.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p>{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                {order.requested_delivery_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Requested Delivery</p>
                    <p>{new Date(order.requested_delivery_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              {order.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p>{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">
                          {item.inventory_stock?.item || `Item ${index + 1}`}
                        </p>
                        {item.specifications && (
                          <p className="text-sm text-muted-foreground">{item.specifications}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-medium">
                            {item.quantity} × ₱{item.unit_price?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            = ₱{((item.quantity * (item.unit_price || 0))).toFixed(2)}
                          </p>
                        </div>
                        {hasPermission('admin') && order.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={deletingItem === item.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No items in this order</p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {order.status === 'pending' && (hasPermission('admin') || hasPermission('owner')) && (
              <>
                <Button
                  variant="outline"
                  onClick={handleReject}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={handleApprove}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
