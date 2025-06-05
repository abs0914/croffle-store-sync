
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adjustStock } from "@/services/inventoryManagement/inventoryItemService";
import { InventoryItem } from "@/types/inventoryManagement";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
  userId: string;
  onSuccess: () => void;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  item,
  userId,
  onSuccess
}: StockAdjustmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newStock, setNewStock] = useState(item.current_stock);
  const [reason, setReason] = useState('');

  const difference = newStock - item.current_stock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a reason for the stock adjustment');
      return;
    }

    setLoading(true);
    const success = await adjustStock(item.id, newStock, reason, userId);
    setLoading(false);

    if (success) {
      onSuccess();
      onOpenChange(false);
      setNewStock(item.current_stock);
      setReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock - {item.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Stock</Label>
            <div className="p-3 bg-muted rounded">
              {item.current_stock} {item.unit}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newStock">New Stock *</Label>
            <Input
              id="newStock"
              type="number"
              min="0"
              step="0.01"
              value={newStock}
              onChange={(e) => setNewStock(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Difference</Label>
            <div className={`p-3 rounded ${
              difference > 0 ? 'bg-green-50 text-green-700' : 
              difference < 0 ? 'bg-red-50 text-red-700' : 
              'bg-muted'
            }`}>
              {difference > 0 ? '+' : ''}{difference} {item.unit}
              {difference !== 0 && (
                <span className="ml-2 text-sm">
                  ({difference > 0 ? 'Increase' : 'Decrease'})
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Adjustment *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you're adjusting the stock..."
              required
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
            <Button type="submit" disabled={loading || difference === 0}>
              {loading ? 'Adjusting...' : 'Adjust Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
