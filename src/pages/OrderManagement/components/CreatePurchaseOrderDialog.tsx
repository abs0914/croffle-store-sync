import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, AlertTriangle } from "lucide-react";
import { createPurchaseOrder, addPurchaseOrderItem, generatePurchaseOrderNumber } from "@/services/orderManagement/purchaseOrderService";
import { fetchOrderableItems } from "@/services/inventoryManagement/commissaryInventoryService";
import { CommissaryInventoryItem } from "@/types/commissaryPurchases";
import { useAuth } from "@/contexts/auth";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  selected: boolean;
}

// Business-relevant category mapping for display
const BUSINESS_CATEGORIES = {
  'Regular Croissants': ['regular croissant', 'plain croissant', 'butter croissant'],
  'Flavored Croissants': ['chocolate croissant', 'almond croissant', 'cheese croissant', 'ham croissant'],
  'Sauces & Spreads': ['sauce', 'spread', 'cream', 'jam', 'butter'],
  'Toppings & Add-ons': ['topping', 'sprinkle', 'powder', 'syrup'],
  'Packaging & Boxes': ['box', 'bag', 'container', 'packaging'],
  'Miscellaneous': [] // catch-all for items that don't match other categories
};

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
    notes: '',
    branch_location: 'CEBU' // Default to CEBU
  });
  const [items, setItems] = useState<OrderItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<Record<string, CommissaryInventoryItem[]>>({});

  useEffect(() => {
    if (open) {
      loadOrderableItems();
      generateOrderNumber();
    }
  }, [open]);

  const categorizeItem = (item: CommissaryInventoryItem): string => {
    const itemName = item.name.toLowerCase();
    
    for (const [category, keywords] of Object.entries(BUSINESS_CATEGORIES)) {
      if (keywords.length === 0) continue; // Skip miscellaneous for now
      
      if (keywords.some(keyword => itemName.includes(keyword))) {
        return category;
      }
    }
    
    return 'Miscellaneous';
  };

  const loadOrderableItems = async () => {
    setItemsLoading(true);
    try {
      const itemsData = await fetchOrderableItems();
      console.log('Loaded orderable items:', itemsData);
      
      // Filter to only show orderable items (converted products)
      const orderableOnly = itemsData.filter(item => item.item_type === 'orderable_item');
      setOrderableItems(orderableOnly);
      
      // Group items by business categories
      const grouped = orderableOnly.reduce((acc, item) => {
        const category = categorizeItem(item);
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
      }, {} as Record<string, CommissaryInventoryItem[]>);
      
      setGroupedItems(grouped);
      
      // Initialize items array with all orderable items
      const initialItems = orderableOnly.map(item => ({
        commissary_item_id: item.id,
        quantity: 0,
        unit_price: item.unit_cost || 0,
        specifications: '',
        selected: false
      }));
      setItems(initialItems);
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

  const handleBulkSelect = (category: string, selected: boolean) => {
    const categoryItems = groupedItems[category] || [];
    const updatedItems = items.map(item => {
      const itemDetails = getItemDetails(item.commissary_item_id);
      if (itemDetails && categorizeItem(itemDetails) === category) {
        return { ...item, selected, quantity: selected ? 1 : 0 };
      }
      return item;
    });
    setItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.storeIds?.[0]) return;
    
    const selectedItems = items.filter(item => item.selected && item.quantity > 0);
    
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item for the order');
      return;
    }
    
    setLoading(true);

    try {
      const totalAmount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      const purchaseOrder = await createPurchaseOrder({
        order_number: formData.order_number,
        store_id: user.storeIds[0],
        created_by: user.id,
        total_amount: totalAmount,
        status: 'pending',
        requested_delivery_date: formData.requested_delivery_date || undefined,
        notes: `${formData.notes}\nBranch Location: ${formData.branch_location}` || undefined
      });

      if (purchaseOrder) {
        // Create purchase order items
        for (const item of selectedItems) {
          if (item.commissary_item_id && item.quantity > 0) {
            let inventoryStockId = item.commissary_item_id;
            
            const itemDetails = getItemDetails(item.commissary_item_id);
            if (itemDetails) {
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
              specifications: `${item.specifications} - Finished Product: ${itemDetails?.name || 'Unknown'}`
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
      notes: '',
      branch_location: 'CEBU'
    });
    setItems([]);
  };

  const lowStockItems = getLowStockItems();
  const selectedItems = items.filter(item => item.selected);
  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order - Finished Products</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select finished products (converted items) from commissary inventory for your store
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
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
              <Label htmlFor="branch_location">Branch Location</Label>
              <Select 
                value={formData.branch_location} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, branch_location: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CEBU">CEBU</SelectItem>
                  <SelectItem value="OUTSIDE_CEBU">OUTSIDE CEBU</SelectItem>
                </SelectContent>
              </Select>
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
                {lowStockItems.length} finished product{lowStockItems.length !== 1 ? 's' : ''} below minimum threshold
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Available Finished Products ({selectedItems.length} selected)</Label>
              <div className="text-sm font-medium">
                Total: ₱{totalAmount.toFixed(2)}
              </div>
            </div>
            
            {itemsLoading ? (
              <div className="text-center py-8">Loading finished products...</div>
            ) : Object.keys(groupedItems).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No finished products available. Please create conversions in Production Management first.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                  <div key={category} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">{category}</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkSelect(category, true)}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkSelect(category, false)}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {categoryItems.map((orderableItem) => {
                        const itemIndex = items.findIndex(item => item.commissary_item_id === orderableItem.id);
                        const item = items[itemIndex];
                        const isLowStock = orderableItem.current_stock <= orderableItem.minimum_threshold;
                        
                        return (
                          <div key={orderableItem.id} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg">
                            <div className="col-span-1">
                              <Checkbox
                                checked={item?.selected || false}
                                onCheckedChange={(checked) => updateItem(itemIndex, 'selected', checked)}
                              />
                            </div>
                            
                            <div className="col-span-4">
                              <div className="font-medium">{orderableItem.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Stock: {orderableItem.current_stock} {orderableItem.uom}
                                {isLowStock && <span className="text-amber-600 ml-1">(Low Stock)</span>}
                              </div>
                            </div>
                            
                            <div className="col-span-2">
                              <Label className="text-xs">Unit Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item?.unit_price || 0}
                                onChange={(e) => updateItem(itemIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                                disabled={!item?.selected}
                              />
                            </div>
                            
                            <div className="col-span-1">
                              <Label className="text-xs">Unit</Label>
                              <div className="text-sm font-medium">{orderableItem.uom}</div>
                            </div>
                            
                            <div className="col-span-2">
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                min="0"
                                value={item?.quantity || 0}
                                onChange={(e) => updateItem(itemIndex, 'quantity', parseInt(e.target.value) || 0)}
                                disabled={!item?.selected}
                              />
                            </div>
                            
                            <div className="col-span-2">
                              <Label className="text-xs">Amount</Label>
                              <div className="text-sm font-medium">
                                ₱{((item?.quantity || 0) * (item?.unit_price || 0)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedItems.length === 0 || itemsLoading}>
              {loading ? 'Creating...' : `Create Order (${selectedItems.length} items)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
