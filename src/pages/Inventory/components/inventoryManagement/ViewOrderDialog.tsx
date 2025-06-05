
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/types/inventoryManagement";
import { format } from "date-fns";

interface ViewOrderDialogProps {
  order: Order;
  onClose: () => void;
}

export function ViewOrderDialog({ order, onClose }: ViewOrderDialogProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'ordered':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'received':
        return 'bg-emerald-100 text-emerald-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order Details</span>
            <Badge className={getStatusColor(order.status)}>
              {order.status.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Order Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Order Number: </span>
                  {order.order_number}
                </div>
                <div>
                  <span className="font-medium">Supplier: </span>
                  {order.supplier?.name}
                </div>
                <div>
                  <span className="font-medium">Total Amount: </span>
                  ₱{order.total_amount.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Created: </span>
                  {format(new Date(order.created_at), 'PPp')}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Dates</h3>
              <div className="space-y-2 text-sm">
                {order.ordered_date && (
                  <div>
                    <span className="font-medium">Ordered: </span>
                    {format(new Date(order.ordered_date), 'PPp')}
                  </div>
                )}
                {order.expected_delivery_date && (
                  <div>
                    <span className="font-medium">Expected Delivery: </span>
                    {format(new Date(order.expected_delivery_date), 'PP')}
                  </div>
                )}
                {order.received_date && (
                  <div>
                    <span className="font-medium">Received: </span>
                    {format(new Date(order.received_date), 'PPp')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          {order.supplier && (
            <div>
              <h3 className="font-medium mb-2">Supplier Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Contact Person: </span>
                  {order.supplier.contact_person || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Email: </span>
                  {order.supplier.email || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Phone: </span>
                  {order.supplier.phone || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Lead Time: </span>
                  {order.supplier.lead_time_days} days
                </div>
              </div>
              {order.supplier.address && (
                <div className="mt-2 text-sm">
                  <span className="font-medium">Address: </span>
                  {order.supplier.address}
                </div>
              )}
            </div>
          )}

          {/* Order Items */}
          <div>
            <h3 className="font-medium mb-2">Order Items</h3>
            {order.order_items && order.order_items.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Item</th>
                      <th className="text-right p-3">Quantity</th>
                      <th className="text-right p-3">Unit Cost</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-right p-3">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.order_items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">
                          {item.inventory_item?.name || 'Unknown Item'}
                        </td>
                        <td className="text-right p-3">{item.quantity}</td>
                        <td className="text-right p-3">₱{item.unit_cost.toFixed(2)}</td>
                        <td className="text-right p-3">₱{item.total_cost?.toFixed(2) || '0.00'}</td>
                        <td className="text-right p-3">{item.received_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No items in this order yet.</p>
            )}
          </div>

          {/* Notes */}
          {order.notes && (
            <div>
              <h3 className="font-medium mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                {order.notes}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
