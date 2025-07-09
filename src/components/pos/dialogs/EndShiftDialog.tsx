
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Shift } from "@/types";
import { Camera, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/utils/format";

// Import the refactored components
import ShiftPhotoSection from "./shift/ShiftPhotoSection";
import EndingCashSection from "./shift/EndingCashSection";
import ShiftTransactionReport from "./shift/ShiftTransactionReport";

interface EndShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentShift: Shift | null;
  onEndShift: (endingCash: number, photo?: string) => Promise<void>;
}

export default function EndShiftDialog({
  isOpen,
  onOpenChange,
  currentShift,
  onEndShift
}: EndShiftDialogProps) {
  const [endingCash, setEndingCash] = useState<number>(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [showCameraView, setShowCameraView] = useState<boolean>(false);
  const [cashError, setCashError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setEndingCash(0);
      setPhoto(null);
      setShowCameraView(false);
      setCashError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Initialize ending cash when dialog opens
  useEffect(() => {
    if (isOpen && currentShift?.startingCash) {
      setEndingCash(currentShift.startingCash);
    }
  }, [isOpen, currentShift?.startingCash]);

  // Validate ending cash amount whenever it changes
  useEffect(() => {
    if (currentShift && endingCash < currentShift.startingCash) {
      setCashError(`Ending cash must be at least ${formatCurrency(currentShift.startingCash)} (starting cash amount)`);
    } else {
      setCashError(null);
    }
  }, [endingCash, currentShift?.startingCash]);

  const handleSubmit = async () => {
    if (!currentShift) return;
    
    // Validate cash amount
    if (endingCash < currentShift.startingCash) {
      setCashError(`Ending cash must be at least ${formatCurrency(currentShift.startingCash)} (starting cash amount)`);
      return;
    }

    // Require photo capture
    if (!photo) {
      // Auto-show camera if no photo taken
      setShowCameraView(true);
      return;
    }
    
    try {
      setIsSubmitting(true);
      await onEndShift(endingCash, photo);
      setShowCameraView(false);
    } catch (error) {
      console.error('Error ending shift:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setShowCameraView(false);
  };

  const canSubmit = !cashError && photo && !isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            End Current Shift
          </DialogTitle>
          <DialogDescription>
            Enter your ending cash amount and take a photo to complete your shift.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4 flex-1 overflow-y-auto">
          {/* Cash Section */}
          <EndingCashSection 
            endingCash={endingCash}
            setEndingCash={setEndingCash}
            currentShift={currentShift}
            cashError={cashError}
          />
          
          {/* Required Photo Section */}
          <div className="space-y-2">
            <ShiftPhotoSection 
              photo={photo}
              setPhoto={setPhoto}
              showCameraView={showCameraView}
              setShowCameraView={setShowCameraView}
            />
            {!photo && (
              <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                📸 Photo required: Please take a photo of your cash drawer before ending your shift.
              </p>
            )}
          </div>
          
          {/* Shift Transaction Report */}
          <ShiftTransactionReport currentShift={currentShift} />
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Ending Shift...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                End Shift
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
