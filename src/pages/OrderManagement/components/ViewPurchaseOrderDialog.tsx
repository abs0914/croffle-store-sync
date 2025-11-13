
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseOrder } from "@/types/orderManagement";
import { updatePurchaseOrder, updatePurchaseOrderItem, deletePurchaseOrderItem, addPurchaseOrderItem } from "@/services/orderManagement/purchaseOrderService";
import { fetchOrderableItems } from "@/services/inventoryManagement/commissaryInventoryService";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { CheckCircle, XCircle, Package, Trash2, Edit, Save, X, Plus } from "lucide-react";
import { useState, useEffect } from "react";

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
  const { currentStore } = useStore();
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [addingItem, setAddingItem] = useState(false);
  const [orderableItems, setOrderableItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemPrice, setNewItemPrice] = useState<number>(0);

  useEffect(() => {
    if (currentStore && addingItem) {
      loadOrderableItems();
    }
  }, [currentStore, addingItem]);

  const loadOrderableItems = async () => {
    if (!currentStore) return;
    const items = await fetchOrderableItems(currentStore.id);
    setOrderableItems(items);
  };

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

  const handleEditItem = (itemId: string, quantity: number) => {
    setEditingItem(itemId);
    setEditQuantity(quantity);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditQuantity(0);
  };

  const handleSaveItem = async (itemId: string, unitPrice: number) => {
    try {
      const success = await updatePurchaseOrderItem(itemId, {
        quantity: editQuantity,
        unit_price: unitPrice
      });
      if (success) {
        setEditingItem(null);
        onSuccess(); // Refresh the order data
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedItemId || newItemQuantity <= 0 || newItemPrice <= 0) {
      return;
    }

    const success = await addPurchaseOrderItem(
      order.id,
      selectedItemId,
      newItemQuantity,
      newItemPrice
    );

    if (success) {
      setAddingItem(false);
      setSelectedItemId('');
      setNewItemQuantity(1);
      setNewItemPrice(0);
      onSuccess(); // Refresh the order data
    }
  };

  const handleCancelAddItem = () => {
    setAddingItem(false);
    setSelectedItemId('');
    setNewItemQuantity(1);
    setNewItemPrice(0);
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Order Items</CardTitle>
              {order.status === 'pending' && (hasPermission('admin') || hasPermission('owner') || user?.role === 'manager' || user?.role === 'cashier') && !addingItem && (
                <Button variant="outline" size="sm" onClick={() => setAddingItem(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {addingItem && (
                  <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                    <div className="space-y-2">
                      <Label>Select Item</Label>
                      <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {orderableItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} - {item.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={newItemQuantity}
                          onChange={(e) => setNewItemQuantity(parseFloat(e.target.value) || 1)}
                          min="1"
                          step="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Price (₱)</Label>
                        <Input
                          type="number"
                          value={newItemPrice}
                          onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={handleCancelAddItem}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleAddItem} disabled={!selectedItemId || newItemQuantity <= 0 || newItemPrice <= 0}>
                        Add Item
                      </Button>
                    </div>
                  </div>
                )}
                {order.items && order.items.length > 0 ? (
                  <>
                    {order.items.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">
                          {item.item_name || item.inventory_stock?.item || `Item ${index + 1}`}
                        </p>
                        {item.specifications && (
                          <p className="text-sm text-muted-foreground">{item.specifications}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {editingItem === item.id ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(parseFloat(e.target.value) || 0)}
                                className="w-20"
                                min="1"
                                step="1"
                              />
                              <span>×</span>
                              <span className="font-medium">₱{item.unit_price?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSaveItem(item.id, item.unit_price || 0)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-right">
                              <p className="font-medium">
                                {item.quantity} × ₱{item.unit_price?.toFixed(2) || '0.00'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                = ₱{((item.quantity * (item.unit_price || 0))).toFixed(2)}
                              </p>
                            </div>
                            {(hasPermission('admin') || hasPermission('owner') || user?.role === 'manager' || user?.role === 'cashier') && order.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditItem(item.id, item.quantity)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteItem(item.id)}
                                  disabled={deletingItem === item.id}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    ))}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No items in this order</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {order.status === 'pending' && (hasPermission('admin') || hasPermission('owner') || user?.role === 'manager' || user?.role === 'cashier') && (
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
