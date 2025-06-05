
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PurchaseOrder } from "@/types/orderManagement";
import { updatePurchaseOrder } from "@/services/orderManagement/purchaseOrderService";
import { createDeliveryOrder } from "@/services/orderManagement/deliveryOrderService";
import { useAuth } from "@/contexts/auth";

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
  const { user } = useAuth();

  const handleStatusUpdate = async (newStatus: string) => {
    await updatePurchaseOrder(order.id, { status: newStatus as any });
    onSuccess();
  };

  const handleCreateDeliveryOrder = async () => {
    await createDeliveryOrder(order.id);
    await updatePurchaseOrder(order.id, { status: 'completed' });
    onSuccess();
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase Order Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Order Number:</span>
                  <span>{order.order_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge variant={getStatusColor(order.status)}>
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Supplier:</span>
                  <span>{order.supplier?.name || 'No supplier'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Total Amount:</span>
                  <span>₱{order.total_amount.toFixed(2)}</span>
                </div>
                {order.requested_delivery_date && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Requested Delivery:</span>
                    <span>{new Date(order.requested_delivery_date).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Created:</span>
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                {order.approved_at && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Approved:</span>
                    <span>{new Date(order.approved_at).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">Last Updated:</span>
                  <span>{new Date(order.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{order.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <span className="font-medium">{item.inventory_stock?.item}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({item.inventory_stock?.unit})
                        </span>
                        {item.specifications && (
                          <p className="text-sm text-muted-foreground">{item.specifications}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p>Qty: {item.quantity}</p>
                        {item.unit_price && (
                          <p className="text-sm text-muted-foreground">
                            ₱{item.unit_price.toFixed(2)} each
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No items added</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center pt-4">
            <div className="flex gap-2">
              {user?.role === 'admin' && order.status === 'approved' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate('in_progress')}
                  >
                    Mark In Progress
                  </Button>
                  <Button
                    onClick={handleCreateDeliveryOrder}
                  >
                    Create Delivery Order
                  </Button>
                </>
              )}
            </div>
            
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
