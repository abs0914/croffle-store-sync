
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DeliveryOrder } from "@/types/orderManagement";
import { fetchDeliveryOrders } from "@/services/orderManagement/deliveryOrderService";
import { createGRN } from "@/services/orderManagement/grnService";
import { useAuth } from "@/contexts/auth";

interface CreateGRNDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateGRNDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateGRNDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [formData, setFormData] = useState({
    delivery_order_id: '',
    quality_check_passed: true,
    remarks: '',
    digital_signature: ''
  });

  useEffect(() => {
    if (open) {
      loadDeliveryOrders();
    }
  }, [open]);

  const loadDeliveryOrders = async () => {
    const orders = await fetchDeliveryOrders();
    // Filter for delivered orders that don't have GRNs yet
    const completedOrders = orders.filter(order => 
      order.status === 'delivery_complete'
    );
    setDeliveryOrders(completedOrders);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setLoading(true);

    try {
      const grn = await createGRN(formData.delivery_order_id, user.id);

      if (grn) {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating GRN:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      delivery_order_id: '',
      quality_check_passed: true,
      remarks: '',
      digital_signature: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Goods Received Note</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="delivery_order_id">Delivery Order *</Label>
            <Select
              value={formData.delivery_order_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, delivery_order_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select delivery order" />
              </SelectTrigger>
              <SelectContent>
                {deliveryOrders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.delivery_number} - {order.purchase_order?.order_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="quality_check_passed"
              checked={formData.quality_check_passed}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, quality_check_passed: !!checked }))
              }
            />
            <Label htmlFor="quality_check_passed">Quality check passed</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="Any discrepancies, notes, or observations..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="digital_signature">Digital Signature</Label>
            <Textarea
              id="digital_signature"
              value={formData.digital_signature}
              onChange={(e) => setFormData(prev => ({ ...prev, digital_signature: e.target.value }))}
              placeholder="Enter your name or signature"
              rows={2}
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
              {loading ? 'Creating...' : 'Create GRN'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
