
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, Package, CheckCircle2 } from "lucide-react";
import { OrderWithStatus, fetchPendingOrders, updateOrderStatus } from "@/services/orderManagement/orderStatusService";
import { formatCurrency } from "@/utils/format";
import { format } from "date-fns";

interface PendingOrdersPanelProps {
  storeId: string;
}

export function PendingOrdersPanel({ storeId }: PendingOrdersPanelProps) {
  const [orders, setOrders] = useState<OrderWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    const data = await fetchPendingOrders(storeId);
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    if (storeId) {
      loadOrders();
    }
  }, [storeId]);

  const handleStatusChange = async (orderId: string, newStatus: OrderWithStatus['order_status']) => {
    const success = await updateOrderStatus(orderId, newStatus);
    if (success) {
      loadOrders(); // Refresh the list
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'preparing':
        return 'warning';
      case 'ready':
        return 'success';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'preparing':
        return <Package className="h-4 w-4" />;
      case 'ready':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pending Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading orders...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Pending Orders
          {orders.length > 0 && (
            <Badge variant="secondary">{orders.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-muted-foreground">No pending orders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.order_status)}
                    <span className="font-medium">#{order.receipt_number}</span>
                    <Badge variant={getStatusColor(order.order_status) as any}>
                      {order.order_status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                  </span>
                </div>

                {order.customer && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span>{order.customer.name}</span>
                    {order.customer.phone && (
                      <span className="text-muted-foreground">• {order.customer.phone}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">{formatCurrency(order.total)}</span>
                    <span className="text-muted-foreground ml-2">
                      {order.items?.length || 0} items
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={order.order_status}
                      onValueChange={(value) => handleStatusChange(order.id, value as OrderWithStatus['order_status'])}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {order.order_notes && (
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    <strong>Notes:</strong> {order.order_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
