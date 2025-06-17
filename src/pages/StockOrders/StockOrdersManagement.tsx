
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  TruckIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useQuery } from '@tanstack/react-query';
import { fetchStockOrders, updateStockOrderStatus } from '@/services/productCatalog/stockOrderService';
import { StockOrder } from '@/services/productCatalog/types';
import { format } from 'date-fns';

export const StockOrdersManagement: React.FC = () => {
  const { user } = useAuth();
  const storeId = user?.store_ids?.[0] || '';

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['stock-orders', storeId],
    queryFn: () => fetchStockOrders(storeId),
    enabled: !!storeId,
  });

  const getStatusIcon = (status: StockOrder['status']) => {
    switch (status) {
      case 'requested':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fulfilled':
        return <TruckIcon className="h-4 w-4 text-purple-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: StockOrder['status']) => {
    switch (status) {
      case 'requested':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'fulfilled':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filterOrdersByStatus = (status?: StockOrder['status']) => {
    if (!status) return orders;
    return orders.filter(order => order.status === status);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: StockOrder['status']) => {
    const success = await updateStockOrderStatus(orderId, newStatus, user?.id);
    if (success) {
      refetch();
    }
  };

  const OrderCard: React.FC<{ order: StockOrder }> = ({ order }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{order.order_number}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(order.order_date), 'MMM dd, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(order.status)}
            <Badge className={getStatusColor(order.status)}>
              {order.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {order.notes && (
          <p className="text-sm text-muted-foreground">{order.notes}</p>
        )}

        {order.items && order.items.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1">
              {order.items.slice(0, 3).map((item, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span>{item.inventory_item?.item || 'Unknown item'}</span>
                  <span>{item.requested_quantity} {item.inventory_item?.unit}</span>
                </div>
              ))}
              {order.items.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{order.items.length - 3} more items...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action buttons based on user role and order status */}
        {user?.role === 'admin' || user?.role === 'owner' ? (
          <div className="flex gap-2 pt-2">
            {order.status === 'requested' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStatusUpdate(order.id, 'approved')}
                >
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                >
                  Reject
                </Button>
              </>
            )}
            {order.status === 'approved' && (
              <Button 
                size="sm"
                onClick={() => handleStatusUpdate(order.id, 'fulfilled')}
              >
                Mark Fulfilled
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Orders</h1>
          <p className="text-muted-foreground">Manage inventory stock requests</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Stock Order
        </Button>
      </div>

      {/* Orders Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="requested">Requested ({filterOrdersByStatus('requested').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({filterOrdersByStatus('approved').length})</TabsTrigger>
          <TabsTrigger value="fulfilled">Fulfilled ({filterOrdersByStatus('fulfilled').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requested" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterOrdersByStatus('requested').map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterOrdersByStatus('approved').map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fulfilled" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterOrdersByStatus('fulfilled').map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </TabsContent>

        {orders.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No stock orders found</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first stock order request.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Stock Order
              </Button>
            </CardContent>
          </Card>
        )}
      </Tabs>
    </div>
  );
};
