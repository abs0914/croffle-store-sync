
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { createCommissaryInventoryItem } from "@/services/inventoryManagement/commissaryInventoryService";
import { fetchSuppliers } from "@/services/inventoryManagement/supplierService";

interface AddCommissaryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddCommissaryItemDialog({
  open,
  onOpenChange,
  onSuccess
}: AddCommissaryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    category: 'raw_materials' as 'raw_materials' | 'packaging_materials' | 'supplies',
    current_stock: 0,
    minimum_threshold: 0,
    unit: 'kg' as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
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

  const loadSuppliers = async () => {
    const data = await fetchSuppliers();
    setSuppliers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const item = await createCommissaryInventoryItem({
      ...formData,
      supplier_id: formData.supplier_id || undefined,
      sku: formData.sku || undefined,
      barcode: formData.barcode || undefined,
      expiry_date: formData.expiry_date || undefined,
      storage_location: formData.storage_location || undefined,
      is_active: true
    });

    setLoading(false);

    if (item) {
      onSuccess();
      onOpenChange(false);
      setFormData({
        name: '',
        category: 'raw_materials',
        current_stock: 0,
        minimum_threshold: 0,
        unit: 'kg',
        unit_cost: 0,
        supplier_id: '',
        sku: '',
        barcode: '',
        expiry_date: '',
        storage_location: ''
      });
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
              <Label htmlFor="unit">Unit *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="pieces">pieces</SelectItem>
                  <SelectItem value="liters">liters</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="boxes">boxes</SelectItem>
                  <SelectItem value="packs">packs</SelectItem>
                </SelectContent>
              </Select>
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
