
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { updateCommissaryInventoryItem } from "@/services/inventoryManagement/commissaryInventoryService";
import { fetchSuppliers } from "@/services/inventoryManagement/supplierService";
import { UOMSelect } from "@/components/shared/UOMSelect";

interface EditCommissaryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CommissaryInventoryItem | null;
  onSuccess: () => void;
}

export function EditCommissaryItemDialog({
  open,
  onOpenChange,
  item,
  onSuccess
}: EditCommissaryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    category: 'raw_materials' as 'raw_materials' | 'packaging_materials' | 'supplies',
    minimum_threshold: 0,
    uom: '', // Changed from unit to uom
    unit_cost: 0,
    supplier_id: '',
    sku: '',
    barcode: '',
    expiry_date: '',
    storage_location: ''
  });

  useEffect(() => {
    if (open) {
      loadSuppliers();
      if (item) {
        setFormData({
          name: item.name,
          category: item.category,
          minimum_threshold: item.minimum_threshold,
          uom: item.unit || item.uom, // Support both unit and uom during transition
          unit_cost: item.unit_cost || 0,
          supplier_id: item.supplier_id || '',
          sku: item.sku || '',
          barcode: item.barcode || '',
          expiry_date: item.expiry_date || '',
          storage_location: item.storage_location || ''
        });
      }
    }
  }, [open, item]);

  const loadSuppliers = async () => {
    const data = await fetchSuppliers();
    setSuppliers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    
    setLoading(true);

    const updatedItem = await updateCommissaryInventoryItem(item.id, formData);

    setLoading(false);

    if (updatedItem) {
      onSuccess();
      onOpenChange(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Commissary Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uom">UOM *</Label>
            <UOMSelect
              value={formData.uom}
              onChange={(value) => setFormData(prev => ({ ...prev, uom: value }))}
              placeholder="Select UOM"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
