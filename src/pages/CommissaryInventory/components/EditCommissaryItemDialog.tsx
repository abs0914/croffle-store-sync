
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCommissaryInventoryItem } from "@/services/inventoryManagement/commissaryInventoryService";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
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
    category: 'raw_materials' as 'raw_materials' | 'packaging_materials' | 'supplies',
    item_type: 'raw_material' as 'raw_material' | 'supply' | 'orderable_item',
    current_stock: 0,
    minimum_threshold: 0,
    uom: 'pieces',
    unit_cost: 0,
    sku: '',
    storage_location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        item_type: item.item_type,
        current_stock: item.current_stock,
        minimum_threshold: item.minimum_threshold,
        uom: item.uom,
        unit_cost: item.unit_cost || 0,
        sku: item.sku || '',
        storage_location: item.storage_location || ''
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Commissary Item</DialogTitle>
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
              </SelectContent>
            </Select>
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
            <Label htmlFor="unit_cost">Unit Cost</Label>
            <Input
              id="unit_cost"
              type="number"
              step="0.01"
              value={formData.unit_cost}
              onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: Number(e.target.value) }))}
            />
          </div>
          <div className="flex gap-2">
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
