
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCommissaryInventoryItem } from "@/services/inventoryManagement/commissaryInventoryService";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { UOMSelect } from "@/components/shared/UOMSelect";
import { toast } from "sonner";

interface EditCommissaryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CommissaryInventoryItem | null;
  onSuccess: () => void;
}

export function EditCommissaryItemDialog({ open, onOpenChange, item, onSuccess }: EditCommissaryItemDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    business_category: '',
    category: 'raw_materials' as 'raw_materials' | 'packaging_materials' | 'supplies' | 'finished_goods',
    item_type: 'raw_material' as 'raw_material' | 'supply' | 'orderable_item',
    current_stock: 0,
    minimum_threshold: 0,
    uom: 'pieces',
    unit_cost: 0,
    sku: '',
    storage_location: '',
    supplier_id: '',
    expiry_date: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        business_category: item.business_category || '',
        category: item.category,
        item_type: item.item_type,
        current_stock: item.current_stock,
        minimum_threshold: item.minimum_threshold,
        uom: item.uom,
        unit_cost: item.unit_cost || 0,
        sku: item.sku || '',
        storage_location: item.storage_location || '',
        supplier_id: item.supplier_id || '',
        expiry_date: item.expiry_date || ''
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setIsSubmitting(true);
    try {
      const success = await updateCommissaryInventoryItem(item.id, formData);
      if (success) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Commissary Inventory Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="business_category">Category *</Label>
              <Input
                id="business_category"
                value={formData.business_category}
                onChange={(e) => setFormData(prev => ({ ...prev, business_category: e.target.value }))}
                placeholder="e.g., Croffle Items, SAUCES, TOPPINGS"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="current_stock">Current Stock</Label>
              <Input
                id="current_stock"
                type="number"
                value={formData.current_stock}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Use stock adjustment to change stock levels</p>
            </div>
            <div>
              <Label htmlFor="minimum_threshold">Min Threshold *</Label>
              <Input
                id="minimum_threshold"
                type="number"
                value={formData.minimum_threshold}
                onChange={(e) => setFormData(prev => ({ ...prev, minimum_threshold: Number(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="uom">UOM *</Label>
              <UOMSelect
                value={formData.uom}
                onChange={(value) => setFormData(prev => ({ ...prev, uom: value }))}
                allowCustom={true}
              />
            </div>
            <div>
              <Label htmlFor="unit_cost">
                Purchase Cost (per unit)
                <span className="text-xs text-muted-foreground ml-1">(Optional)</span>
              </Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_type">Item Type *</Label>
              <Select
                value={formData.item_type}
                onValueChange={(value: 'raw_material' | 'supply' | 'orderable_item') => 
                  setFormData(prev => ({ ...prev, item_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw_material">Raw Material</SelectItem>
                  <SelectItem value="supply">Supply</SelectItem>
                  <SelectItem value="orderable_item">Orderable Item (Finished Product)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="storage_location">Storage Location</Label>
            <Input
              id="storage_location"
              value={formData.storage_location}
              onChange={(e) => setFormData(prev => ({ ...prev, storage_location: e.target.value }))}
              placeholder="e.g., BRANCHES, FRANCHISEE CEBU"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
