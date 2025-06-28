
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";

interface ConversionExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProduct?: CommissaryInventoryItem | null;
  onSuccess: () => void;
}

export function ConversionExecutionDialog({ 
  open, 
  onOpenChange, 
  selectedProduct, 
  onSuccess 
}: ConversionExecutionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Execute Conversion Process</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This feature allows you to convert raw materials into finished products. 
            {selectedProduct && ` Converting for: ${selectedProduct.name}`}
          </p>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Coming Soon:</strong> Conversion execution functionality will be implemented to allow 
              converting multiple raw materials into finished products based on predefined recipes.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              onOpenChange(false);
              onSuccess();
            }}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
