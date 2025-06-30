
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, CheckCircle, XCircle, Building2, User, Calendar, Package, DollarSign, Truck, ClipboardCheck } from 'lucide-react';
import { PurchaseOrder } from '@/types/orderManagement';
import { Store } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  onFulfillOrder?: (orderId: string) => void;
  onDeliverOrder?: (orderId: string) => void;
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
  onFulfillOrder,
  onDeliverOrder,
  stores
}: AdminPurchaseOrdersListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span className="text-gray-600">Loading purchase orders...</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders found</h3>
        <p className="text-gray-500">No purchase orders match your current search criteria.</p>
        <Button onClick={onRefresh} className="mt-4">
          Refresh Orders
        </Button>
      </div>
    );
  }

  const getStoreName = (order: PurchaseOrder) => {
    // First try to get from the populated store relation
    if (order.store && order.store.name) {
      return order.store.name;
    }
    
    // Fallback to finding store by ID
    const store = stores.find(s => s.id === order.store_id);
    return store?.name || `Store ${order.store_id?.substring(0, 8)}` || 'Unknown Store';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'fulfilled': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusActions = (order: PurchaseOrder) => {
    const actions = [];
    
    if (order.status === 'pending') {
      actions.push(
        <Button
          key="approve"
          variant="outline"
          size="sm"
          onClick={() => onApproveOrder(order.id)}
          className="text-green-600 hover:bg-green-50"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Approve
        </Button>
      );
      actions.push(
        <Button
          key="reject"
          variant="outline"
          size="sm"
          onClick={() => onRejectOrder(order.id)}
          className="text-red-600 hover:bg-red-50"
        >
          <XCircle className="h-3 w-3 mr-1" />
          Reject
        </Button>
      );
    }
    
    if (order.status === 'approved' && onFulfillOrder) {
      actions.push(
        <Button
          key="fulfill"
          variant="outline"
          size="sm"
          onClick={() => onFulfillOrder(order.id)}
          className="text-blue-600 hover:bg-blue-50"
        >
          <Truck className="h-3 w-3 mr-1" />
          Fulfill
        </Button>
      );
    }
    
    if (order.status === 'fulfilled' && onDeliverOrder) {
      actions.push(
        <Button
          key="deliver"
          variant="outline"
          size="sm"
          onClick={() => onDeliverOrder(order.id)}
          className="text-purple-600 hover:bg-purple-50"
        >
          <ClipboardCheck className="h-3 w-3 mr-1" />
          Deliver
        </Button>
      );
    }
    
    return actions;
  };

  const allSelected = selectedOrders.length === orders.length && orders.length > 0;

  if (viewMode === 'grid') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
          />
          <span className="text-sm text-gray-600">
            Select all ({orders.length} orders)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <Card key={order.id} className={`transition-all ${selectedOrders.includes(order.id) ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={() => onSelectOrder(order.id)}
                    />
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-blue-600 mt-2 font-semibold">
                  <Building2 className="h-4 w-4" />
                  <span>{getStoreName(order)}</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {order.supplier && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-3 w-3" />
                      <span>{order.supplier.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="h-3 w-3" />
                    <span>₱{order.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-3 border-t flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewOrder(order)}
                    className="flex-shrink-0"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  {getStatusActions(order)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <TableHead>Order Number</TableHead>
              <TableHead>Store Location</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={() => onSelectOrder(order.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{order.order_number}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-600">{getStoreName(order)}</span>
                  </div>
                </TableCell>
                <TableCell>{order.supplier?.name || 'No Supplier'}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>₱{order.total_amount.toLocaleString()}</TableCell>
                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {getStatusActions(order)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
