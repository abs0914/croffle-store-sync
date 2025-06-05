
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, CheckCircle } from "lucide-react";
import { DeliveryOrder } from "@/types/orderManagement";
import { fetchDeliveryOrders, updateDeliveryOrder } from "@/services/orderManagement/deliveryOrderService";

export function DeliveryOrdersTab() {
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadDeliveryOrders = async () => {
    setLoading(true);
    const orders = await fetchDeliveryOrders();
    setDeliveryOrders(orders);
    setLoading(false);
  };

  useEffect(() => {
    loadDeliveryOrders();
  }, []);

  const handleStatusUpdate = async (order: DeliveryOrder, newStatus: string) => {
    await updateDeliveryOrder(order.id, { 
      status: newStatus as any,
      actual_delivery_date: newStatus === 'delivery_complete' ? new Date().toISOString().split('T')[0] : undefined
    });
    loadDeliveryOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'for_delivery': return 'default';
      case 'partial_delivery': return 'warning';
      case 'delivery_complete': return 'success';
      default: return 'secondary';
    }
  };

  const filteredOrders = deliveryOrders.filter(order =>
    order.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.purchase_order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.purchase_order?.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Delivery Orders</CardTitle>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search delivery orders..."
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
              {searchTerm ? 'No delivery orders found matching your search' : 'No delivery orders available'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{order.delivery_number}</h3>
                      <Badge variant={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      PO: {order.purchase_order?.order_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supplier: {order.purchase_order?.supplier?.name}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {order.status === 'for_delivery' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(order, 'partial_delivery')}
                      >
                        Mark Partial
                      </Button>
                    )}
                    {(order.status === 'for_delivery' || order.status === 'partial_delivery') && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order, 'delivery_complete')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
                
                {order.delivery_notes && (
                  <p className="text-sm">{order.delivery_notes}</p>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(order.created_at).toLocaleDateString()}
                  {order.scheduled_delivery_date && (
                    <span className="ml-4">
                      Scheduled: {new Date(order.scheduled_delivery_date).toLocaleDateString()}
                    </span>
                  )}
                  {order.actual_delivery_date && (
                    <span className="ml-4">
                      Delivered: {new Date(order.actual_delivery_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
