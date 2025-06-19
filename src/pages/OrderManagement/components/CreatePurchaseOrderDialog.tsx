
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { createPurchaseOrder, addPurchaseOrderItem, generatePurchaseOrderNumber } from "@/services/orderManagement/purchaseOrderService";
import { fetchSuppliers } from "@/services/inventoryManagement/supplierService";
import { fetchInventoryStock } from "@/services/inventoryManagement/recipeService";
import { Supplier, InventoryStock } from "@/types/orderManagement";
import { useAuth } from "@/contexts/auth";

interface CreatePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface OrderItem {
  inventory_stock_id: string;
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryStock, setInventoryStock] = useState<InventoryStock[]>([]);
  const [formData, setFormData] = useState({
    order_number: '',
    supplier_id: '',
    requested_delivery_date: '',
    notes: ''
  });
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (open) {
      loadData();
      generateOrderNumber();
    }
  }, [open]);

  const loadData = async () => {
    if (!user?.storeIds?.[0]) return;
    
    const [suppliersData, stockData] = await Promise.all([
      fetchSuppliers(),
      fetchInventoryStock(user.storeIds[0])
    ]);
    
    setSuppliers(suppliersData);
    setInventoryStock(stockData);
  };

  const generateOrderNumber = async () => {
    const orderNumber = await generatePurchaseOrderNumber();
    setFormData(prev => ({ ...prev, order_number: orderNumber }));
  };

  const addItem = () => {
    setItems([...items, {
      inventory_stock_id: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.storeIds?.[0]) return;
    
    setLoading(true);

    try {
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      const purchaseOrder = await createPurchaseOrder({
        ...formData,
        store_id: user.storeIds[0],
        created_by: user.id,
        total_amount: totalAmount,
        status: 'pending'
      });

      if (purchaseOrder) {
        for (const item of items) {
          if (item.inventory_stock_id && item.quantity > 0) {
            await addPurchaseOrderItem({
              purchase_order_id: purchaseOrder.id,
              inventory_stock_id: item.inventory_stock_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              specifications: item.specifications
            });
          }
        }

        onSuccess();
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      order_number: '',
      supplier_id: '',
      requested_delivery_date: '',
      notes: ''
    });
    setItems([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
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
              <Label htmlFor="supplier_id">Supplier *</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                  <div className="col-span-4">
                    <Label className="text-xs">Item</Label>
                    <Select
                      value={item.inventory_stock_id}
                      onValueChange={(value) => updateItem(index, 'inventory_stock_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryStock.map((stock) => (
                          <SelectItem key={stock.id} value={stock.id}>
                            {stock.item} ({stock.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
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
              ))}
              
              {items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <p>No items added yet</p>
                  <p className="text-sm">Click "Add Item" to start building your purchase order</p>
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
            <Button type="submit" disabled={loading || items.length === 0}>
              {loading ? 'Creating...' : 'Create Purchase Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
