
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateOrder } from "@/services/inventoryManagement/orderService";
import { Order, Supplier } from "@/types/inventoryManagement";

interface EditOrderDialogProps {
  order: Order;
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditOrderDialog({ order, suppliers, onClose, onSuccess }: EditOrderDialogProps) {
  const [formData, setFormData] = useState({
    order_number: order.order_number,
    supplier_id: order.supplier_id,
    status: order.status,
    total_amount: order.total_amount,
    expected_delivery_date: order.expected_delivery_date || '',
    received_date: order.received_date ? new Date(order.received_date).toISOString().split('T')[0] : '',
    notes: order.notes || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    
    const updates = {
      ...formData,
      received_date: formData.received_date ? new Date(formData.received_date).toISOString() : null
    };

    const result = await updateOrder(order.id, updates);
    
    if (result) {
      onSuccess();
    }
    
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
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
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
            <Label htmlFor="received_date">Received Date</Label>
            <Input
              id="received_date"
              type="date"
              value={formData.received_date}
              onChange={(e) => setFormData(prev => ({ ...prev, received_date: e.target.value }))}
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
              {loading ? 'Updating...' : 'Update Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
