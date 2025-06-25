
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, AlertTriangle } from "lucide-react";
import { createPurchaseOrder, addPurchaseOrderItem, generatePurchaseOrderNumber } from "@/services/orderManagement/purchaseOrderService";
import { fetchOrderableItems } from "@/services/inventoryManagement/commissaryInventoryService";
import { CommissaryInventoryItem } from "@/types/commissaryPurchases";
import { useAuth } from "@/contexts/auth";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CreatePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface OrderItem {
  commissary_item_id: string;
  quantity: number;
  unit_price: number;
  specifications: string;
}

export function CreatePurchaseOrderDialog({
  open,
  onOpenChange,
  onSuccess
}: CreatePurchaseOrderDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [orderableItems, setOrderableItems] = useState<CommissaryInventoryItem[]>([]);
  const [formData, setFormData] = useState({
    order_number: '',
    requested_delivery_date: '',
    notes: ''
  });
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (open) {
      loadOrderableItems();
      generateOrderNumber();
    }
  }, [open]);

  const loadOrderableItems = async () => {
    setItemsLoading(true);
    try {
      const itemsData = await fetchOrderableItems();
      console.log('Loaded orderable items:', itemsData);
      setOrderableItems(itemsData);
    } catch (error) {
      console.error('Error loading orderable items:', error);
      toast.error('Failed to load orderable items');
    } finally {
      setItemsLoading(false);
    }
  };

  const generateOrderNumber = async () => {
    const orderNumber = await generatePurchaseOrderNumber();
    setFormData(prev => ({ ...prev, order_number: orderNumber }));
  };

  const addItem = () => {
    setItems([...items, {
      commissary_item_id: '',
      quantity: 0,
      unit_price: 0,
      specifications: ''
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const getLowStockItems = () => {
    return orderableItems.filter(item => 
      item.current_stock <= item.minimum_threshold
    );
  };

  const getItemDetails = (itemId: string) => {
    return orderableItems.find(item => item.id === itemId);
  };

  const getSuggestedQuantity = (itemId: string) => {
    const item = getItemDetails(itemId);
    if (!item) return 1;
    
    const needed = Math.max(item.minimum_threshold * 2 - item.current_stock, 1);
    return needed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.storeIds?.[0]) return;
    
    if (items.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }
    
    setLoading(true);

    try {
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      const purchaseOrder = await createPurchaseOrder({
        order_number: formData.order_number,
        store_id: user.storeIds[0],
        created_by: user.id,
        total_amount: totalAmount,
        status: 'pending',
        requested_delivery_date: formData.requested_delivery_date || undefined,
        notes: formData.notes || undefined
      });

      if (purchaseOrder) {
        // Create a mapping from commissary items to inventory items
        for (const item of items) {
          if (item.commissary_item_id && item.quantity > 0) {
            // First check if corresponding inventory_stock item exists
            let inventoryStockId = item.commissary_item_id; // Use commissary ID as fallback
            
            const itemDetails = getItemDetails(item.commissary_item_id);
            if (itemDetails) {
              // Try to find or create corresponding inventory_stock item
              const { data: existingStock } = await supabase
                .from('inventory_stock')
                .select('id')
                .eq('store_id', user.storeIds[0])
                .eq('item', itemDetails.name)
                .eq('unit', itemDetails.uom)
                .single();
              
              if (existingStock) {
                inventoryStockId = existingStock.id;
              } else {
                // Create new inventory_stock item for this store
                const { data: newStock } = await supabase
                  .from('inventory_stock')
                  .insert({
                    store_id: user.storeIds[0],
                    item: itemDetails.name,
                    unit: itemDetails.uom,
                    stock_quantity: 0,
                    cost: item.unit_price
                  })
                  .select('id')
                  .single();
                
                if (newStock) {
                  inventoryStockId = newStock.id;
                }
              }
            }

            await addPurchaseOrderItem({
              purchase_order_id: purchaseOrder.id,
              inventory_stock_id: inventoryStockId,
              quantity: item.quantity,
              unit_price: item.unit_price,
              specifications: `${item.specifications} - Commissary Item: ${itemDetails?.name || 'Unknown'}`
            });
          }
        }

        onSuccess();
        onOpenChange(false);
        resetForm();
        toast.success('Purchase order created successfully');
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast.error('Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      order_number: '',
      requested_delivery_date: '',
      notes: ''
    });
    setItems([]);
  };

  const lowStockItems = getLowStockItems();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Items from Commissary</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Order finished goods and orderable items from the commissary for your store
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_number">Order Number *</Label>
              <Input
                id="order_number"
                value={formData.order_number}
                onChange={(e) => setFormData(prev => ({ ...prev, order_number: e.target.value }))}
                required
                readOnly
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="requested_delivery_date">Requested Delivery Date</Label>
              <Input
                id="requested_delivery_date"
                type="date"
                value={formData.requested_delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, requested_delivery_date: e.target.value }))}
              />
            </div>
          </div>

          {lowStockItems.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800">Low Stock Alert</span>
              </div>
              <p className="text-sm text-amber-700 mb-2">
                {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} below minimum threshold
              </p>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.slice(0, 5).map(item => (
                  <Badge key={item.id} variant="secondary" className="text-xs">
                    {item.name}: {item.current_stock}/{item.minimum_threshold}
                  </Badge>
                ))}
                {lowStockItems.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{lowStockItems.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Order Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes for the commissary..."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Items to Order</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => {
                const itemDetails = getItemDetails(item.commissary_item_id);
                const isLowStock = itemDetails && itemDetails.current_stock <= itemDetails.minimum_threshold;
                
                return (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                    <div className="col-span-4">
                      <Label className="text-xs">Orderable Item</Label>
                      <Select
                        value={item.commissary_item_id}
                        onValueChange={(value) => {
                          updateItem(index, 'commissary_item_id', value);
                          const suggestedQty = getSuggestedQuantity(value);
                          updateItem(index, 'quantity', suggestedQty);
                          // Set unit price from item cost
                          const selectedItem = getItemDetails(value);
                          if (selectedItem?.unit_cost) {
                            updateItem(index, 'unit_price', selectedItem.unit_cost);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={itemsLoading ? "Loading..." : "Select item"} />
                        </SelectTrigger>
                        <SelectContent>
                          {orderableItems.map((orderableItem) => (
                            <SelectItem key={orderableItem.id} value={orderableItem.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{orderableItem.name} ({orderableItem.uom})</span>
                                <div className="flex items-center gap-2 ml-2">
                                  <span className="text-xs text-muted-foreground">
                                    Stock: {orderableItem.current_stock}
                                  </span>
                                  {orderableItem.current_stock <= orderableItem.minimum_threshold && (
                                    <Badge variant="destructive" className="text-xs">Low</Badge>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {itemDetails && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Available: {itemDetails.current_stock} {itemDetails.uom}
                          {isLowStock && <span className="text-amber-600 ml-1">(Low Stock)</span>}
                        </div>
                      )}
                    </div>
                    
                    <div className="col-span-2">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="col-span-3">
                      <Label className="text-xs">Specifications</Label>
                      <Input
                        placeholder="Optional specifications"
                        value={item.specifications}
                        onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="w-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <p>No items added yet</p>
                  <p className="text-sm">Click "Add Item" to start building your order</p>
                  {lowStockItems.length > 0 && (
                    <p className="text-sm text-amber-600 mt-2">
                      Consider ordering the {lowStockItems.length} low stock items above
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || items.length === 0 || itemsLoading}>
              {loading ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
