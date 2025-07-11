
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCommissaryInventoryItem } from "@/services/inventoryManagement/commissaryInventoryService";
import { fetchSuppliers } from "@/services/inventoryManagement/supplierService";
import { UOMSelect } from "@/components/shared/UOMSelect";
import { toast } from "sonner";

interface AddCommissaryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Supplier {
  id: string;
  name: string;
}

export function AddCommissaryItemDialog({
  open,
  onOpenChange,
  onSuccess
}: AddCommissaryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    category: 'raw_materials' as 'raw_materials' | 'packaging_materials' | 'supplies' | 'finished_goods',
    item_type: 'raw_material' as 'raw_material' | 'supply' | 'orderable_item',
    current_stock: 0,
    minimum_threshold: 0,
    uom: 'pieces',
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
    }
  }, [open]);

  // Auto-set item_type based on category
  useEffect(() => {
    if (formData.category === 'raw_materials') {
      setFormData(prev => ({ ...prev, item_type: 'raw_material' }));
    } else {
      setFormData(prev => ({ ...prev, item_type: 'supply' }));
    }
  }, [formData.category]);

  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await createCommissaryInventoryItem({
        ...formData,
        supplier_id: formData.supplier_id || undefined,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        expiry_date: formData.expiry_date || undefined,
        storage_location: formData.storage_location || undefined,
        is_active: true
      });

      if (success) {
        toast.success('Commissary item created successfully');
        onSuccess();
        onOpenChange(false);
        // Reset form
        setFormData({
          name: '',
          category: 'raw_materials',
          item_type: 'raw_material',
          current_stock: 0,
          minimum_threshold: 0,
          uom: 'pieces',
          unit_cost: 0,
          supplier_id: '',
          sku: '',
          barcode: '',
          expiry_date: '',
          storage_location: ''
        });
      }
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to create commissary item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Commissary Inventory Item</DialogTitle>
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
                placeholder="Enter item name"
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
                  <SelectItem value="finished_goods">Finished Goods</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_stock">Current Stock *</Label>
              <Input
                id="current_stock"
                type="number"
                min="0"
                step="0.01"
                value={formData.current_stock}
                onChange={(e) => setFormData(prev => ({ ...prev, current_stock: parseFloat(e.target.value) || 0 }))}
                required
              />
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
            
            <div className="space-y-2">
              <Label htmlFor="uom">Unit of Measure *</Label>
              <UOMSelect
                value={formData.uom}
                onChange={(value) => setFormData(prev => ({ ...prev, uom: value }))}
                placeholder="Select UOM"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost</Label>
              <Input
                id="unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="Item SKU"
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
              {loading ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
