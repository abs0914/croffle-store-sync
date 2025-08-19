import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PurchaseOrder } from "@/types/orderManagement";
import { 
  createFulfillment, 
  createFulfillmentItems, 
  updateFulfillmentItem, 
  completeFulfillment,
  PurchaseOrderFulfillment,
  PurchaseOrderFulfillmentItem
} from "@/services/orderManagement/fulfillmentService";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import { Package, CheckCircle2, AlertCircle, Minus, Plus } from "lucide-react";

interface FulfillmentDialogProps {
  order: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FulfillmentDialog({ order, isOpen, onClose, onSuccess }: FulfillmentDialogProps) {
  const { user } = useAuth();
  const [currentFulfillment, setCurrentFulfillment] = useState<PurchaseOrderFulfillment | null>(null);
  const [fulfillmentItems, setFulfillmentItems] = useState<PurchaseOrderFulfillmentItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      initializeFulfillment();
    }
  }, [isOpen, order]);

  const initializeFulfillment = async () => {
    if (!user?.id || !order.items) return;

    setLoading(true);
    try {
      // Create a new fulfillment session
      const fulfillment = await createFulfillment(order.id, user.id, notes);
      
      if (fulfillment) {
        setCurrentFulfillment(fulfillment);
        
        // Create fulfillment items based on purchase order items
        const items = order.items.map(item => ({
          purchase_order_item_id: item.id,
          ordered_quantity: item.quantity,
          unit_price: item.unit_price
        }));

        await createFulfillmentItems(fulfillment.id, items);
        
        // Initialize fulfillment items state
        const initialItems: PurchaseOrderFulfillmentItem[] = order.items.map(item => ({
          id: '', // Will be set after creation
          fulfillment_id: fulfillment.id,
          purchase_order_item_id: item.id,
          ordered_quantity: item.quantity,
          fulfilled_quantity: 0,
          unit_price: item.unit_price,
          notes: '',
          status: 'pending' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          purchase_order_item: item
        }));

        setFulfillmentItems(initialItems);
      }
    } catch (error) {
      console.error('Error initializing fulfillment:', error);
      toast.error('Failed to initialize fulfillment');
    } finally {
      setLoading(false);
    }
  };

  const updateItemQuantity = (itemIndex: number, newQuantity: number) => {
    const updatedItems = [...fulfillmentItems];
    const item = updatedItems[itemIndex];
    
    // Ensure quantity doesn't exceed ordered quantity
    const quantity = Math.min(Math.max(0, newQuantity), item.ordered_quantity);
    updatedItems[itemIndex] = {
      ...item,
      fulfilled_quantity: quantity,
      status: quantity === 0 ? 'pending' : 
              quantity === item.ordered_quantity ? 'fulfilled' : 'partial'
    };
    
    setFulfillmentItems(updatedItems);
  };

  const updateItemNotes = (itemIndex: number, itemNotes: string) => {
    const updatedItems = [...fulfillmentItems];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      notes: itemNotes
    };
    setFulfillmentItems(updatedItems);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return 'bg-green-500';
      case 'partial':
        return 'bg-yellow-500';
      case 'unavailable':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4" />;
      case 'unavailable':
        return <Minus className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleCompleteFulfillment = async () => {
    if (!currentFulfillment || !user?.id) return;

    setLoading(true);
    try {
      // Update all fulfillment items in database
      for (const item of fulfillmentItems) {
        if (item.id) {
          await updateFulfillmentItem(item.id, {
            fulfilled_quantity: item.fulfilled_quantity,
            status: item.status,
            notes: item.notes
          });
        }
      }

      // Complete the fulfillment
      await completeFulfillment(currentFulfillment.id, user.id, notes);
      
      toast.success('Fulfillment completed successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error completing fulfillment:', error);
      toast.error('Failed to complete fulfillment');
    } finally {
      setLoading(false);
    }
  };

  const canComplete = fulfillmentItems.length > 0 && 
    fulfillmentItems.some(item => item.fulfilled_quantity > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Fulfill Order - {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Store</Label>
                  <p className="font-medium">{order.store?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Amount</Label>
                  <p className="font-medium">₱{order.total_amount.toFixed(2)}</p>
                </div>
              </div>
              {currentFulfillment && (
                <div className="mt-4">
                  <Label className="text-muted-foreground">Fulfillment Number</Label>
                  <p className="font-medium">{currentFulfillment.fulfillment_number}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fulfillment Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Items to Fulfill</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {fulfillmentItems.map((item, index) => (
                    <div key={item.purchase_order_item_id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">
                              {item.purchase_order_item?.inventory_stock?.item || 'Unknown Item'}
                            </h4>
                            <Badge 
                              variant="secondary"
                              className={`${getStatusColor(item.status)} text-white`}
                            >
                              <span className="flex items-center gap-1">
                                {getStatusIcon(item.status)}
                                {item.status}
                              </span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Unit: {item.purchase_order_item?.inventory_stock?.unit}
                            {item.unit_price && ` • Price: ₱${item.unit_price.toFixed(2)}`}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Ordered Quantity</Label>
                          <p className="font-medium">{item.ordered_quantity}</p>
                        </div>
                        <div>
                          <Label htmlFor={`fulfilled-${index}`} className="text-xs text-muted-foreground">
                            Fulfilled Quantity
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(index, item.fulfilled_quantity - 1)}
                              disabled={item.fulfilled_quantity <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              id={`fulfilled-${index}`}
                              type="number"
                              value={item.fulfilled_quantity}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                              min="0"
                              max={item.ordered_quantity}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(index, item.fulfilled_quantity + 1)}
                              disabled={item.fulfilled_quantity >= item.ordered_quantity}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`notes-${index}`} className="text-xs text-muted-foreground">
                          Item Notes
                        </Label>
                        <Textarea
                          id={`notes-${index}`}
                          value={item.notes || ''}
                          onChange={(e) => updateItemNotes(index, e.target.value)}
                          placeholder="Add notes for this item..."
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Fulfillment Notes */}
          <div>
            <Label htmlFor="fulfillment-notes">Overall Fulfillment Notes</Label>
            <Textarea
              id="fulfillment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any general notes about this fulfillment..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleCompleteFulfillment} 
            disabled={loading || !canComplete}
          >
            {loading ? "Processing..." : "Complete Fulfillment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}