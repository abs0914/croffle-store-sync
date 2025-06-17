
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import { PurchaseOrder } from '@/types/orderManagement';
import { Store } from '@/types';

interface AdminPurchaseOrdersListProps {
  orders: PurchaseOrder[];
  selectedOrders: string[];
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  onSelectOrder: (orderId: string) => void;
  onSelectAll: () => void;
  onRefresh: () => void;
  onViewOrder: (order: PurchaseOrder) => void;
  onApproveOrder: (orderId: string) => void;
  onRejectOrder: (orderId: string) => void;
  stores: Store[];
}

export function AdminPurchaseOrdersList({
  orders,
  selectedOrders,
  viewMode,
  isLoading,
  onSelectOrder,
  onSelectAll,
  onRefresh,
  onViewOrder,
  onApproveOrder,
  onRejectOrder,
  stores
}: AdminPurchaseOrdersListProps) {
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

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No purchase orders found</p>
          <Button onClick={onRefresh} className="mt-4">
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <Checkbox
          checked={selectedOrders.length === orders.length}
          onCheckedChange={onSelectAll}
        />
        <span className="text-sm text-muted-foreground">
          {selectedOrders.length > 0 
            ? `${selectedOrders.length} selected` 
            : 'Select all orders'
          }
        </span>
      </div>

      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {orders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={() => onSelectOrder(order.id)}
                  />
                  <div>
                    <h3 className="font-semibold">{order.order_number}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getStoreName(order.store_id)}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusColor(order.status)}>
                  {order.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Supplier:</span>
                  <span>{order.supplier?.name || 'No supplier'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">₱{order.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                {order.requested_delivery_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery:</span>
                    <span>{new Date(order.requested_delivery_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewOrder(order)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {order.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onApproveOrder(order.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRejectOrder(order.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
