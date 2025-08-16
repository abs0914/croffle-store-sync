
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ShoppingCart, Eye, Edit, Trash2, Package } from "lucide-react";
import { fetchOrders, deleteOrder } from "@/services/inventoryManagement/orderService";
import { fetchSuppliers } from "@/services/inventoryManagement/supplierService";
import { Order, Supplier } from "@/types/inventoryManagement";
import { format } from "date-fns";
import { AddOrderDialog } from "./AddOrderDialog";
import { EditOrderDialog } from "./EditOrderDialog";
import { ViewOrderDialog } from "./ViewOrderDialog";

interface OrdersListProps {
  storeId: string;
}

export function OrdersList({ storeId }: OrdersListProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [ordersData, suppliersData] = await Promise.all([
      fetchOrders(storeId),
      fetchSuppliers()
    ]);
    setOrders(ordersData);
    setSuppliers(suppliersData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  const handleDeleteOrder = async (order: Order) => {
    if (window.confirm(`Are you sure you want to delete order ${order.order_number}?`)) {
      const success = await deleteOrder(order.id);
      if (success) {
        loadData();
      }
    }
  };

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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === '' || order.status === selectedStatus;
    const matchesSupplier = selectedSupplier === '' || order.supplier_id === selectedSupplier;
    
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Purchase Orders
            </CardTitle>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={selectedStatus || "all"} onValueChange={(value) => setSelectedStatus(value === "all" ? "" : value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedSupplier || "all"} onValueChange={(value) => setSelectedSupplier(value === "all" ? "" : value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedStatus || selectedSupplier
                  ? 'No orders found matching your filters'
                  : 'No orders created yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{order.order_number}</h3>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Supplier: {order.supplier?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created: {format(new Date(order.created_at), 'PPp')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteOrder(order)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Amount: </span>
                      ₱{order.total_amount.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Items: </span>
                      {order.order_items?.length || 0}
                    </div>
                    {order.expected_delivery_date && (
                      <div>
                        <span className="font-medium">Expected: </span>
                        {format(new Date(order.expected_delivery_date), 'PP')}
                      </div>
                    )}
                    {order.received_date && (
                      <div>
                        <span className="font-medium">Received: </span>
                        {format(new Date(order.received_date), 'PP')}
                      </div>
                    )}
                  </div>
                  
                  {order.notes && (
                    <div className="text-sm">
                      <span className="font-medium">Notes: </span>
                      {order.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showAddDialog && (
        <AddOrderDialog
          storeId={storeId}
          suppliers={suppliers}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            loadData();
            setShowAddDialog(false);
          }}
        />
      )}

      {showEditDialog && selectedOrder && (
        <EditOrderDialog
          order={selectedOrder}
          suppliers={suppliers}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            loadData();
            setShowEditDialog(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {showViewDialog && selectedOrder && (
        <ViewOrderDialog
          order={selectedOrder}
          onClose={() => {
            setShowViewDialog(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}
