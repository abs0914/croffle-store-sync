
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, AlertCircle, RefreshCw } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { fetchOrderableItems } from "@/services/inventoryManagement/commissaryInventoryService";
import { createPurchaseOrder } from "@/services/orderManagement/purchaseOrderService";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

interface CreatePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface OrderItem {
  commissary_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  specifications?: string;
}

export function CreatePurchaseOrderDialog({
  open,
  onOpenChange,
  onSuccess
}: CreatePurchaseOrderDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderableItems, setOrderableItems] = useState<CommissaryInventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');

  const loadOrderableItems = async () => {
    console.log('Loading orderable items for user:', user?.email, 'role:', user?.role);
    setLoadingItems(true);
    try {
      const items = await fetchOrderableItems();
      console.log('Loaded orderable items:', items.length, items);
      setOrderableItems(items);
    } catch (error) {
      console.error('Error loading orderable items:', error);
      toast.error('Failed to load available products');
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadOrderableItems();
    }
  }, [open]);

  const addOrderItem = (item: CommissaryInventoryItem) => {
    const existingIndex = orderItems.findIndex(oi => oi.commissary_item_id === item.id);
    
    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += 1;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        commissary_item_id: item.id,
        item_name: item.name,
        quantity: 1,
        unit_price: item.unit_cost || 0,
        specifications: ''
      }]);
    }
  };

  const updateOrderItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    } else {
      const updated = [...orderItems];
      updated[index].quantity = quantity;
      setOrderItems(updated);
    }
  };

  const updateOrderItemPrice = (index: number, price: number) => {
    const updated = [...orderItems];
    updated[index].unit_price = price;
    setOrderItems(updated);
  };

  const updateOrderItemSpecs = (index: number, specs: string) => {
    const updated = [...orderItems];
    updated[index].specifications = specs;
    setOrderItems(updated);
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const handleSubmit = async () => {
    if (!user?.storeIds?.[0]) {
      toast.error('No store assigned to user');
      return;
    }

    if (orderItems.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        store_id: user.storeIds[0],
        created_by: user.id,
        status: 'pending' as const,
        total_amount: totalAmount,
        requested_delivery_date: requestedDeliveryDate || undefined,
        notes: notes || undefined,
        items: orderItems.map(item => ({
          // Pass the commissary item ID as inventory_stock_id (the service will handle the mapping)
          inventory_stock_id: item.commissary_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          specifications: item.specifications
        }))
      };

      console.log('Creating purchase order with data:', orderData);
      const result = await createPurchaseOrder(orderData);
      if (result) {
        toast.success('Purchase order created successfully');
        onSuccess();
        onOpenChange(false);
        // Reset form
        setOrderItems([]);
        setNotes('');
        setRequestedDeliveryDate('');
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast.error('Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 px-1">
          {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="delivery-date">Requested Delivery Date</Label>
              <Input
                id="delivery-date"
                type="date"
                value={requestedDeliveryDate}
                onChange={(e) => setRequestedDeliveryDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Order notes or special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Available Products */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Available Products</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadOrderableItems}
                  disabled={loadingItems}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingItems ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingItems ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-croffle-accent mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading available products...</p>
                </div>
              ) : orderableItems.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No finished products available for ordering</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no products currently marked as orderable in the commissary inventory.
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Debug info:</p>
                    <p>User: {user?.email}</p>
                    <p>Role: {user?.role}</p>
                    <p>Store IDs: {user?.storeIds?.join(', ')}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                  {orderableItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {item.current_stock} {item.uom}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cost: ₱{item.unit_cost?.toFixed(2) || '0.00'} per {item.uom}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addOrderItem(item)}
                        className="w-full"
                        disabled={item.current_stock <= 0}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add to Order
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          {orderItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Items ({orderItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.item_name}</h4>
                        <Input
                          placeholder="Specifications (optional)"
                          value={item.specifications || ''}
                          onChange={(e) => updateOrderItemSpecs(index, e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateOrderItemQuantity(index, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-12 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateOrderItemQuantity(index, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="w-32">
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateOrderItemPrice(index, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-24 text-right">
                        <div className="text-sm font-medium">
                          ₱{(item.quantity * item.unit_price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-lg font-semibold">Total Amount:</span>
                    <span className="text-lg font-semibold">₱{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || orderItems.length === 0}
          >
            {loading ? 'Creating...' : 'Create Purchase Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
