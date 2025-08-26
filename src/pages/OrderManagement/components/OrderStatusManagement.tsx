
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  User, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { OrderWithStatus, fetchPendingOrders, updateOrderStatus } from "@/services/orderManagement/orderStatusService";
import { formatCurrency } from "@/utils/format";
import { format } from "date-fns";
import { toast } from "sonner";

export function OrderStatusManagement() {
  const { currentStore } = useStore();
  const [orders, setOrders] = useState<OrderWithStatus[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    if (!currentStore?.id) return;
    
    setLoading(true);
    try {
      const data = await fetchPendingOrders(currentStore.id);
      setOrders(data);
      setFilteredOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const refreshOrders = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
    toast.success('Orders refreshed');
  };

  useEffect(() => {
    loadOrders();
  }, [currentStore?.id]);

  useEffect(() => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.receipt_number.toLowerCase().includes(query) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(query)) ||
        (order.customer?.phone && order.customer.phone.includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.order_status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchQuery, statusFilter]);

  const handleStatusChange = async (orderId: string, newStatus: OrderWithStatus['order_status']) => {
    try {
      const success = await updateOrderStatus(orderId, newStatus);
      if (success) {
        await loadOrders(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const ordersByStatus = {
    pending: filteredOrders.filter(o => o.order_status === 'pending'),
    preparing: filteredOrders.filter(o => o.order_status === 'preparing'),
    ready: filteredOrders.filter(o => o.order_status === 'ready'),
    completed: filteredOrders.filter(o => o.order_status === 'completed'),
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Order Status Management</h2>
          <p className="text-muted-foreground">
            Track and manage customer orders for {currentStore?.name}
          </p>
        </div>
        <Button 
          onClick={refreshOrders} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Order status tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({ordersByStatus.pending.length})
          </TabsTrigger>
          <TabsTrigger value="preparing" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Preparing ({ordersByStatus.preparing.length})
          </TabsTrigger>
          <TabsTrigger value="ready" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Ready ({ordersByStatus.ready.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            All Orders ({filteredOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <OrderList 
            orders={ordersByStatus.pending} 
            onStatusChange={handleStatusChange}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="preparing">
          <OrderList 
            orders={ordersByStatus.preparing} 
            onStatusChange={handleStatusChange}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="ready">
          <OrderList 
            orders={ordersByStatus.ready} 
            onStatusChange={handleStatusChange}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="all">
          <OrderList 
            orders={filteredOrders} 
            onStatusChange={handleStatusChange}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface OrderListProps {
  orders: OrderWithStatus[];
  onStatusChange: (orderId: string, newStatus: OrderWithStatus['order_status']) => void;
  loading: boolean;
}

function OrderList({ orders, onStatusChange, loading }: OrderListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Loading orders...</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
        <p className="text-gray-500">No orders match the current criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {orders.map((order) => (
        <Card key={order.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(order.order_status)}
                <div>
                  <h3 className="font-semibold">Order #{order.receipt_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              <Badge className={getStatusColor(order.order_status)}>
                {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
              </Badge>
            </div>

            {order.customer && (
              <div className="flex items-center gap-2 mb-4 text-sm">
                <User className="h-4 w-4" />
                <span>{order.customer.name}</span>
                {order.customer.phone && (
                  <span className="text-muted-foreground">• {order.customer.phone}</span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="text-sm">
                <span className="font-medium">{formatCurrency(order.total)}</span>
                <span className="text-muted-foreground ml-2">
                  {order.items?.length || 0} items
                </span>
              </div>
              <Select
                value={order.order_status}
                onValueChange={(value) => onStatusChange(order.id, value as OrderWithStatus['order_status'])}
              >
                <SelectTrigger className="w-40">
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

            {order.items && order.items.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Order Items:</h4>
                <div className="space-y-1">
                  {order.items.slice(0, 3).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">
                        {item.quantity}x {formatCurrency(item.unitPrice)}
                      </span>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
