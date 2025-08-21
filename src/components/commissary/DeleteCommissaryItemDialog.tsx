import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Store, ArrowRight } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { deleteCommissaryInventoryItem } from "@/services/inventoryManagement/commissaryInventoryService";
import { checkCommissaryItemLinks } from "@/services/inventoryManagement/commissaryLinkService";
import { toast } from "sonner";

interface DeleteCommissaryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CommissaryInventoryItem | null;
  onSuccess: () => void;
}

export function DeleteCommissaryItemDialog({
  open,
  onOpenChange,
  item,
  onSuccess
}: DeleteCommissaryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [linkStatus, setLinkStatus] = useState<{
    isLinked: boolean;
    linkedStores: Array<{storeId: string; storeName: string}>;
  }>({ isLinked: false, linkedStores: [] });

  useEffect(() => {
    if (open && item) {
      checkItemLinks();
    }
  }, [open, item]);

  const checkItemLinks = async () => {
    if (!item) return;
    
    setChecking(true);
    try {
      const result = await checkCommissaryItemLinks(item.id);
      setLinkStatus(result);
    } catch (error) {
      console.error('Error checking links:', error);
      toast.error('Failed to check item links');
    } finally {
      setChecking(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    setLoading(true);
    try {
      const success = await deleteCommissaryInventoryItem(item.id);
      if (success) {
        toast.success('Commissary item deleted successfully');
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error('Failed to delete commissary item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete commissary item');
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Commissary Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm">
            <p className="mb-2">Are you sure you want to delete this item?</p>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-medium">{item.name}</p>
              <p className="text-muted-foreground capitalize">
                {item.category.replace('_', ' ')} • {item.current_stock} {item.uom}
              </p>
            </div>
          </div>

          {checking && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Checking for store connections...
              </p>
            </div>
          )}

          {!checking && linkStatus.isLinked && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-medium">
                    This item is currently linked to {linkStatus.linkedStores.length} store(s):
                  </p>
                  
                  <div className="space-y-2">
                    {linkStatus.linkedStores.map((store, index) => (
                      <div key={store.storeId} className="flex items-center gap-2 text-sm">
                        <Store className="h-4 w-4" />
                        <Badge variant="outline">{store.storeName}</Badge>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-destructive/10 p-3 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
                      <div className="text-xs space-y-1">
                        <p className="font-medium text-destructive">
                          Deleting this item will:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-destructive/90">
                          <li>Remove all conversion records</li>
                          <li>Cancel pending restock requests</li>
                          <li>Affect store inventory calculations</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!checking && !linkStatus.isLinked && (
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                This item is not currently linked to any stores and can be safely deleted.
              </AlertDescription>
            </Alert>
          )}
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
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || checking}
          >
            {loading ? 'Deleting...' : 'Delete Item'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}