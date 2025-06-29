
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, X } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { fetchOrderableItems } from "@/services/inventoryManagement/commissaryInventoryService";
import { createPurchaseOrder } from "@/services/orderManagement/purchaseOrderService";
import { CommissaryInventoryItem } from "@/types/commissary";
import { LocationType } from "@/types/location";
import { supabase } from "@/integrations/supabase/client";
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
  final_price: number;
  shipping_cost: number;
  minimum_order_quantity: number;
  lead_time_days: number;
  item_name: string;
  item_unit: string;
}

export function CreatePurchaseOrderDialog({ open, onOpenChange, onSuccess }: CreatePurchaseOrderDialogProps) {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [loading, setLoading] = useState(false);
  const [orderableItems, setOrderableItems] = useState<CommissaryInventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  
  // Determine location type based on store name/location
  const getLocationTypeFromStore = (storeName: string | undefined): LocationType => {
    if (!storeName) return 'inside_cebu';
    const lowerName = storeName.toLowerCase();
    if (lowerName.includes('cebu') || lowerName.includes('city')) {
      return 'inside_cebu';
    }
    return 'outside_cebu';
  };

  const storeLocationType = getLocationTypeFromStore(currentStore?.name);

  useEffect(() => {
    if (open) {
      loadOrderableItems();
    }
  }, [open]);

  const loadOrderableItems = async () => {
    setLoading(true);
    try {
      const items = await fetchOrderableItems();
      console.log('Loaded orderable items:', items);
      setOrderableItems(items);
    } catch (error) {
      console.error('Error loading orderable items:', error);
      toast.error('Failed to load available products');
    } finally {
      setLoading(false);
    }
  };

  const getLocationPricing = async (commissaryItemId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_location_pricing', {
          item_id: commissaryItemId,
          store_location: storeLocationType
        });

      if (error) {
        console.error('Error fetching location pricing:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching location pricing:', error);
      return null;
    }
  };

  const addItem = async (item: CommissaryInventoryItem) => {
    const pricing = await getLocationPricing(item.id);
    
    if (!pricing) {
      toast.error('Pricing not available for this location');
      return;
    }

    const newItem: OrderItem = {
      commissary_item_id: item.id,
      quantity: pricing.minimum_order_quantity || 1,
      unit_price: pricing.base_price,
      final_price: pricing.final_price,
      shipping_cost: pricing.shipping_cost,
      minimum_order_quantity: pricing.minimum_order_quantity,
      lead_time_days: pricing.lead_time_days,
      item_name: item.name,
      item_unit: item.uom
    };

    setSelectedItems(prev => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    setSelectedItems(prev => 
      prev.map((item, i) => 
        i === index 
          ? { ...item, quantity: Math.max(quantity, item.minimum_order_quantity) }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => {
      const itemTotal = item.final_price * item.quantity + item.shipping_cost;
      return total + itemTotal;
    }, 0);
  };

  const createOrFindInventoryStock = async (item: OrderItem) => {
    if (!user?.storeIds?.[0]) return null;

    // Check if inventory stock item exists
    const { data: existingStock, error: stockError } = await supabase
      .from('inventory_stock')
      .select('id')
      .eq('store_id', user.storeIds[0])
      .eq('item', item.item_name)
      .eq('unit', item.item_unit)
      .single();

    if (stockError && stockError.code !== 'PGRST116') {
      console.error('Error checking inventory stock:', stockError);
      return null;
    }

    if (existingStock) {
      return existingStock.id;
    }

    // Create new inventory stock item
    const { data: newStock, error: createError } = await supabase
      .from('inventory_stock')
      .insert({
        store_id: user.storeIds[0],
        item: item.item_name,
        unit: item.item_unit,
        stock_quantity: 0,
        cost: item.final_price,
        is_active: true
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating inventory stock:', createError);
      return null;
    }

    return newStock.id;
  };

  const handleSubmit = async () => {
    if (!user?.storeIds?.[0] || selectedItems.length === 0) {
      toast.error('Please add items to the order');
      return;
    }

    setLoading(true);
    try {
      // Create or find inventory stock items for each selected item
      const orderItems = [];
      
      for (const item of selectedItems) {
        const inventoryStockId = await createOrFindInventoryStock(item);
        if (!inventoryStockId) {
          toast.error(`Failed to create inventory item for ${item.item_name}`);
          return;
        }
        
        orderItems.push({
          inventory_stock_id: inventoryStockId,
          quantity: item.quantity,
          unit_price: item.final_price,
          specifications: `Location: ${storeLocationType}, Lead time: ${item.lead_time_days} days, Commissary Item: ${item.commissary_item_id}`
        });
      }

      const orderData = {
        store_id: user.storeIds[0],
        created_by: user.id,
        status: 'pending' as const,
        total_amount: calculateTotal(),
        requested_delivery_date: requestedDeliveryDate || undefined,
        notes,
        location_type: storeLocationType,
        items: orderItems
      };

      await createPurchaseOrder(orderData);
      toast.success('Purchase order created successfully');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setSelectedItems([]);
      setNotes('');
      setRequestedDeliveryDate('');
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast.error('Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order - {currentStore?.name}</DialogTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Location: {storeLocationType.replace('_', ' ').toUpperCase()}</Badge>
            <Badge variant="outline">Available Products: {orderableItems.length}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Available Products */}
          <Card>
            <CardHeader>
              <CardTitle>Available Products</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading products...</p>
              ) : orderableItems.length === 0 ? (
                <p className="text-muted-foreground">No products available for ordering</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orderableItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{item.name}</h4>
                        <Button
                          size="sm"
                          onClick={() => addItem(item)}
                          disabled={selectedItems.some(si => si.commissary_item_id === item.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Stock: {item.current_stock} {item.uom}</p>
                        <p>Unit Cost: ₱{item.unit_cost?.toFixed(2) || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Items ({selectedItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedItems.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{item.item_name}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label>Quantity</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(index, item.quantity - 1)}
                              disabled={item.quantity <= item.minimum_order_quantity}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || item.minimum_order_quantity)}
                              className="w-20 text-center"
                              min={item.minimum_order_quantity}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(index, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Min: {item.minimum_order_quantity}
                          </p>
                        </div>
                        
                        <div>
                          <Label>Unit Price</Label>
                          <p className="mt-1">₱{item.final_price.toFixed(2)}</p>
                        </div>
                        
                        <div>
                          <Label>Shipping</Label>
                          <p className="mt-1">₱{item.shipping_cost.toFixed(2)}</p>
                        </div>
                        
                        <div>
                          <Label>Subtotal</Label>
                          <p className="mt-1 font-medium">
                            ₱{(item.final_price * item.quantity + item.shipping_cost).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Lead time: {item.lead_time_days} days</span>
                        <span>Unit: {item.item_unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
              <Label>Total Amount</Label>
              <div className="text-2xl font-bold text-primary mt-1">
                ₱{calculateTotal().toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || selectedItems.length === 0}
            >
              {loading ? 'Creating...' : 'Create Purchase Order'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
