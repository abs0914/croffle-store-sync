
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, AlertTriangle } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createStockOrder } from '@/services/inventory/stockOrderWorkflowService';
import { toast } from 'sonner';

interface StockOrderRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

interface InventoryItem {
  id: string;
  item: string;
  unit: string;
  stock_quantity: number;
  minimum_threshold: number;
  cost?: number;
}

interface OrderItem {
  inventory_stock_id: string;
  requested_quantity: number;
  notes?: string;
}

export const StockOrderRequestDialog: React.FC<StockOrderRequestDialogProps> = ({
  isOpen,
  onClose,
  onOrderCreated
}) => {
  const { currentStore } = useStore();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch inventory items
  const { data: inventoryItems = [], isLoading } = useQuery({
    queryKey: ['inventory-stock', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .order('item');

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentStore?.id && isOpen
  });

  // Auto-add low stock items when dialog opens
  useEffect(() => {
    if (isOpen && inventoryItems.length > 0) {
      const lowStockItems = inventoryItems
        .filter(item => item.stock_quantity <= item.minimum_threshold)
        .map(item => ({
          inventory_stock_id: item.id,
          requested_quantity: Math.max(0, 100 - item.stock_quantity), // Default capacity of 100
          notes: `Low stock: ${item.stock_quantity}/${item.minimum_threshold}`
        }));
      
      setOrderItems(lowStockItems);
    }
  }, [isOpen, inventoryItems]);

  const addOrderItem = (inventoryItem: InventoryItem) => {
    const existingIndex = orderItems.findIndex(
      item => item.inventory_stock_id === inventoryItem.id
    );

    if (existingIndex >= 0) {
      toast.info('Item already in order');
      return;
    }

    const suggestedQuantity = Math.max(
      inventoryItem.minimum_threshold - inventoryItem.stock_quantity,
      1
    );

    setOrderItems([...orderItems, {
      inventory_stock_id: inventoryItem.id,
      requested_quantity: suggestedQuantity
    }]);
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!currentStore?.id || orderItems.length === 0) {
      toast.error('Please add items to the order');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderId = await createStockOrder(
        currentStore.id,
        orderItems,
        orderNotes
      );

      if (orderId) {
        onOrderCreated();
        onClose();
        setOrderItems([]);
        setOrderNotes('');
      }
    } catch (error) {
      console.error('Error creating stock order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInventoryItemById = (id: string) => {
    return inventoryItems.find(item => item.id === id);
  };

  const lowStockCount = inventoryItems.filter(
    item => item.stock_quantity <= item.minimum_threshold
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Request Stock Order</DialogTitle>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{lowStockCount} items below minimum threshold</span>
            </div>
          )}
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Available Items */}
          <div className="flex-1 overflow-hidden">
            <h3 className="font-medium mb-2">Available Items</h3>
            <div className="border rounded-lg p-2 overflow-y-auto h-64">
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {inventoryItems.map(item => {
                    const isLowStock = item.stock_quantity <= item.minimum_threshold;
                    const isInOrder = orderItems.some(
                      orderItem => orderItem.inventory_stock_id === item.id
                    );

                    return (
                      <div
                        key={item.id}
                        className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                          isLowStock ? 'border-amber-200 bg-amber-50' : ''
                        } ${isInOrder ? 'border-blue-200 bg-blue-50' : ''}`}
                        onClick={() => !isInOrder && addOrderItem(item)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{item.item}</p>
                            <p className="text-xs text-muted-foreground">
                              Stock: {item.stock_quantity} {item.unit}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Min: {item.minimum_threshold} {item.unit}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {isLowStock && (
                              <Badge variant="secondary" className="text-xs">
                                Low Stock
                              </Badge>
                            )}
                            {isInOrder && (
                              <Badge variant="default" className="text-xs">
                                Added
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="flex-1 overflow-hidden">
            <h3 className="font-medium mb-2">Order Items ({orderItems.length})</h3>
            <div className="border rounded-lg p-2 overflow-y-auto h-64">
              {orderItems.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No items in order
                </div>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((orderItem, index) => {
                    const inventoryItem = getInventoryItemById(orderItem.inventory_stock_id);
                    if (!inventoryItem) return null;

                    return (
                      <div key={index} className="p-2 border rounded">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-sm">{inventoryItem.item}</p>
                            <p className="text-xs text-muted-foreground">
                              Current: {inventoryItem.stock_quantity} {inventoryItem.unit}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeOrderItem(index)}
                          >
                            ×
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderItem(
                              index,
                              'requested_quantity',
                              Math.max(1, orderItem.requested_quantity - 1)
                            )}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <Input
                            type="number"
                            value={orderItem.requested_quantity}
                            onChange={(e) => updateOrderItem(
                              index,
                              'requested_quantity',
                              parseInt(e.target.value) || 0
                            )}
                            className="w-20 text-center"
                            min="1"
                          />
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderItem(
                              index,
                              'requested_quantity',
                              orderItem.requested_quantity + 1
                            )}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          
                          <span className="text-sm text-muted-foreground">
                            {inventoryItem.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Notes */}
        <div className="space-y-2">
          <Label>Order Notes</Label>
          <Textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Additional notes for this order..."
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || orderItems.length === 0}
          >
            {isSubmitting ? 'Creating...' : 'Create Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
