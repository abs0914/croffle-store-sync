
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth";
import { createCommissaryPurchase, fetchCommissaryItemsForPurchase, fetchSuppliersForCommissary } from "@/services/commissaryPurchases/commissaryPurchaseService";
import type { CommissaryPurchaseForm } from "@/types/commissaryPurchases";

interface CreateCommissaryPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCommissaryPurchaseDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateCommissaryPurchaseDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState<CommissaryPurchaseForm>({
    commissary_item_id: '',
    supplier_id: '',
    quantity_purchased: 0,
    unit_cost: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    batch_number: '',
    expiry_date: '',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
      resetForm();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [itemsData, suppliersData] = await Promise.all([
        fetchCommissaryItemsForPurchase(),
        fetchSuppliersForCommissary()
      ]);
      setItems(itemsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      commissary_item_id: '',
      supplier_id: '',
      quantity_purchased: 0,
      unit_cost: 0,
      purchase_date: new Date().toISOString().split('T')[0],
      invoice_number: '',
      batch_number: '',
      expiry_date: '',
      notes: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    try {
      const success = await createCommissaryPurchase(formData, user.id);
      if (success) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating purchase:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Purchase</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="item">Commissary Item *</Label>
            <Select
              value={formData.commissary_item_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, commissary_item_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Select
              value={formData.supplier_id || ''}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity_purchased}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity_purchased: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="unitCost">Unit Cost *</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="purchaseDate">Purchase Date *</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={formData.purchase_date}
              onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoice">Invoice Number</Label>
              <Input
                id="invoice"
                value={formData.invoice_number || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="batch">Batch Number</Label>
              <Input
                id="batch"
                value={formData.batch_number || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, batch_number: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="expiry">Expiry Date</Label>
            <Input
              id="expiry"
              type="date"
              value={formData.expiry_date || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : 'Record Purchase'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
