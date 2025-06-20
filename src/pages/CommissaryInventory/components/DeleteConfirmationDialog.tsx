
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { deleteCommissaryInventoryItem } from "@/services/inventoryManagement/commissaryInventoryService";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CommissaryInventoryItem | null;
  onSuccess: () => void;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  item,
  onSuccess
}: DeleteConfirmationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (!item || confirmText !== 'DELETE') return;

    setLoading(true);
    const success = await deleteCommissaryInventoryItem(item.id);
    setLoading(false);

    if (success) {
      onSuccess();
      onOpenChange(false);
      setConfirmText('');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setConfirmText('');
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Commissary Item
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              You are about to delete <strong>"{item.name}"</strong> from the commissary inventory.
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-1">Warning:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>This action cannot be undone</li>
                    <li>Current stock: {item.current_stock} {item.uom}</li>
                    <li>Any conversion history will be preserved</li>
                    <li>This item will no longer be available for new conversions</li>
                  </ul>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <strong>DELETE</strong> to confirm:
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || confirmText !== 'DELETE'}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? 'Deleting...' : 'Delete Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
