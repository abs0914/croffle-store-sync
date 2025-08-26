
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { adjustCommissaryInventoryStock } from "@/services/inventoryManagement/commissaryInventoryService";
import { useAuth } from "@/contexts/auth";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CommissaryInventoryItem | null;
  onSuccess: () => void;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  item,
  onSuccess
}: StockAdjustmentDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newStock, setNewStock] = useState(0);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (item && open) {
      setNewStock(item.current_stock);
      setReason('');
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !user?.id) return;

    setLoading(true);

    const success = await adjustCommissaryInventoryStock(
      item.id,
      newStock,
      reason,
      user.id
    );

    setLoading(false);

    if (success) {
      onSuccess();
      onOpenChange(false);
      setNewStock(0);
      setReason('');
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock - {item.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newStock">New Stock Level</Label>
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
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for adjustment..."
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Adjusting...' : 'Adjust Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
