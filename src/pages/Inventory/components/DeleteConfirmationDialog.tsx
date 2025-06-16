
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
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
            Delete Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p>Are you sure you want to delete "{item.name}"?</p>
          
          <div className="space-y-2">
            <Label htmlFor="confirm">Type DELETE to confirm:</Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
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
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
