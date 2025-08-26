
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCommissaryInventoryItem } from "@/services/inventoryManagement/commissaryInventoryService";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { UOMSelect } from "@/components/shared/UOMSelect";
import { toast } from "sonner";

interface AddCommissaryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddCommissaryItemDialog({ open, onOpenChange, onSuccess }: AddCommissaryItemDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'raw_materials' as 'raw_materials' | 'packaging_materials' | 'supplies' | 'finished_goods',
    item_type: 'raw_material' as 'raw_material' | 'supply' | 'orderable_item',
    current_stock: 0,
    minimum_threshold: 0,
    uom: 'pieces',
    unit_cost: 0,
    sku: '',
    storage_location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const itemData: Omit<CommissaryInventoryItem, 'id' | 'created_at' | 'updated_at'> = {
        ...formData,
        is_active: true,
        expiry_date: undefined,
        supplier_id: undefined,
        supplier: undefined
      };

      const success = await createCommissaryInventoryItem(itemData);
      if (success) {
        onSuccess();
        onOpenChange(false);
        setFormData({
          name: '',
          category: 'raw_materials',
          item_type: 'raw_material',
          current_stock: 0,
          minimum_threshold: 0,
          uom: 'pieces',
          unit_cost: 0,
          sku: '',
          storage_location: ''
        });
      }
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Commissary Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw_materials">Raw Materials</SelectItem>
                <SelectItem value="packaging_materials">Packaging Materials</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="finished_goods">Finished Goods</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="current_stock">Current Stock</Label>
            <Input
              id="current_stock"
              type="number"
              value={formData.current_stock}
              onChange={(e) => setFormData(prev => ({ ...prev, current_stock: Number(e.target.value) }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="minimum_threshold">Minimum Threshold</Label>
            <Input
              id="minimum_threshold"
              type="number"
              value={formData.minimum_threshold}
              onChange={(e) => setFormData(prev => ({ ...prev, minimum_threshold: Number(e.target.value) }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="uom">Unit of Measure</Label>
            <UOMSelect
              value={formData.uom}
              onChange={(value) => setFormData(prev => ({ ...prev, uom: value }))}
              placeholder="Select UOM"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
