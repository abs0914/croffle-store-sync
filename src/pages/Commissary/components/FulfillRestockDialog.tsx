
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth";
import { fulfillRestockRequest } from "@/services/commissary/restockingService";
import type { RestockRequest } from "@/services/commissary/restockingService";

interface FulfillRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RestockRequest | null;
  onSuccess: () => void;
}

export function FulfillRestockDialog({
  open,
  onOpenChange,
  request,
  onSuccess
}: FulfillRestockDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (request && open) {
      setQuantity(request.approved_quantity || request.requested_quantity);
      setUnitCost(0);
      setNotes('');
    }
  }, [request, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !user?.id) return;

    setLoading(true);
    try {
      const success = await fulfillRestockRequest({
        restock_request_id: request.id!,
        commissary_item_id: request.commissary_item_id,
        store_id: request.store_id,
        quantity_transferred: quantity,
        unit_cost: unitCost,
        total_cost: quantity * unitCost,
        fulfilled_by: user.id,
        notes
      });

      if (success) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error fulfilling request:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fulfill Restock Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold">Request Details</h4>
            <div className="text-sm space-y-1 mt-2">
              <p><span className="font-medium">Item:</span> Commissary Item</p>
              <p><span className="font-medium">Store:</span> Store Name</p>
              <p><span className="font-medium">Requested:</span> {request.requested_quantity}</p>
              {request.approved_quantity && (
                <p><span className="font-medium">Approved:</span> {request.approved_quantity}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="quantity">Quantity to Transfer *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                max={request.approved_quantity || request.requested_quantity}
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
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
                value={unitCost}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <span className="text-sm font-medium">Total Cost: </span>
              <span className="text-lg font-bold">₱{(quantity * unitCost).toFixed(2)}</span>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any notes about this fulfillment..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Fulfilling...' : 'Fulfill Request'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
