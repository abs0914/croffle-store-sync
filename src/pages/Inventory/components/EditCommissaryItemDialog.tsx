
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
          uom: item.uom, // Use uom instead of unit
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

    const updatedItem = await updateCommissaryInventoryItem(item.id, {
      ...formData,
      supplier_id: formData.supplier_id === 'none' || formData.supplier_id === '' ? undefined : formData.supplier_id,
      sku: formData.sku || undefined,
      barcode: formData.barcode || undefined,
      expiry_date: formData.expiry_date || undefined,
      storage_location: formData.storage_location || undefined
    });

    setLoading(false);

    if (updatedItem) {
      onSuccess();
      onOpenChange(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Commissary Inventory Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="category">Category *</Label>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_stock">Current Stock</Label>
              <Input
                id="current_stock"
                type="number"
                value={item.current_stock}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Use stock adjustment to change stock levels
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minimum_threshold">Min Threshold *</Label>
              <Input
                id="minimum_threshold"
                type="number"
                min="0"
                step="0.01"
                value={formData.minimum_threshold}
                onChange={(e) => setFormData(prev => ({ ...prev, minimum_threshold: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uom">UOM *</Label>
              <UOMSelect
                value={formData.uom}
                onChange={(value) => setFormData(prev => ({ ...prev, uom: value }))}
                placeholder="Select UOM"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost</Label>
              <Input
                id="unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier_id">Supplier</Label>
            <Select
              value={formData.supplier_id || 'none'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value === 'none' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No supplier</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storage_location">Storage Location</Label>
              <Input
                id="storage_location"
                value={formData.storage_location}
                onChange={(e) => setFormData(prev => ({ ...prev, storage_location: e.target.value }))}
                placeholder="e.g., Freezer A, Shelf B2"
              />
            </div>
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
