
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import StartShiftDialogContent from "./shift/StartShiftDialogContent";
import StartShiftDialogFooter from "./shift/StartShiftDialogFooter";

interface StartShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStartShift: (startingCash: number, photo?: string, cashierId?: string) => Promise<void>;
  storeId: string | null;
}

interface DialogState {
  startingCash: number;
  photo: string | null;
  selectedCashierId: string | null;
  showCameraView: boolean;
  isLoading: boolean;
}

export default function StartShiftDialog({
  isOpen,
  onOpenChange,
  onStartShift,
  storeId
}: StartShiftDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [dialogState, setDialogState] = useState<DialogState>({
    startingCash: 0,
    photo: null,
    selectedCashierId: null,
    showCameraView: false,
    isLoading: false
  });

  const handleStateChange = useCallback((state: DialogState) => {
    setDialogState(state);
  }, []);

  const handleSubmit = async () => {
    if (!storeId) {
      toast.error("No store selected");
      return;
    }
    
    if (!dialogState.selectedCashierId) {
      toast.error("Please select a cashier");
      return;
    }
    
    if (!dialogState.photo) {
      toast.error("Please take a photo of your cash drawer");
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log("Starting shift with params:", {
        startingCash: dialogState.startingCash,
        storeId,
        cashierId: dialogState.selectedCashierId
      });
      
      await onStartShift(
        dialogState.startingCash,
        dialogState.photo,
        dialogState.selectedCashierId
      );
    } catch (error) {
      console.error("Error starting shift:", error);
      toast.error(`Failed to start shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const canSubmit = !!(dialogState.photo && dialogState.startingCash > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Start New Shift</DialogTitle>
          <DialogDescription>
            Please count your cash drawer before starting your shift.
          </DialogDescription>
        </DialogHeader>
        
        <StartShiftDialogContent 
          isOpen={isOpen}
          storeId={storeId}
          onStateChange={handleStateChange}
        />
        
        <StartShiftDialogFooter 
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          canSubmit={canSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
