
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createOrder, generateOrderNumber } from "@/services/inventoryManagement/orderService";
import { Supplier } from "@/types/inventoryManagement";

interface AddOrderDialogProps {
  storeId: string;
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddOrderDialog({ storeId, suppliers, onClose, onSuccess }: AddOrderDialogProps) {
  const [formData, setFormData] = useState({
    order_number: generateOrderNumber(),
    supplier_id: '',
    status: 'draft' as const,
    total_amount: 0,
    expected_delivery_date: '',
    notes: '',
    created_by: '' // This should be set to current user ID
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id) {
      alert('Please select a supplier');
      return;
    }

    setLoading(true);
    
    const orderData = {
      ...formData,
      store_id: storeId,
      created_by: 'current-user-id' // TODO: Replace with actual user ID from auth context
    };

    const result = await createOrder(orderData);
    
    if (result) {
      onSuccess();
    }
    
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="order_number">Order Number</Label>
            <Input
              id="order_number"
              value={formData.order_number}
              onChange={(e) => setFormData(prev => ({ ...prev, order_number: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Select value={formData.supplier_id} onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}>
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

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
            <Input
              id="expected_delivery_date"
              type="date"
              value={formData.expected_delivery_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes about this order..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
