
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCashier } from "@/services/cashier/cashierUpdate";
import { Cashier } from "@/types/cashier";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeactivateCashierDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cashier: Cashier | null;
  isActivating?: boolean;
}

export default function DeactivateCashierDialog({ 
  isOpen, 
  onOpenChange,
  cashier,
  isActivating = false
}: DeactivateCashierDialogProps) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: updateCashier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      onOpenChange(false);
    }
  });

  const handleConfirm = async () => {
    if (!cashier) return;

    setIsProcessing(true);
    await updateMutation.mutateAsync({
      id: cashier.id,
      isActive: isActivating
    });
    setIsProcessing(false);
  };

  if (!cashier) return null;

  const title = isActivating ? "Activate Cashier" : "Deactivate Cashier";
  const description = isActivating 
    ? `Are you sure you want to activate ${cashier.fullName}?` 
    : `Are you sure you want to deactivate ${cashier.fullName}? They won't be able to log in or process transactions.`;
  const confirmText = isActivating ? "Activate" : "Deactivate";
  const confirmVariant = isActivating ? "default" : "destructive";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant={confirmVariant as any}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
