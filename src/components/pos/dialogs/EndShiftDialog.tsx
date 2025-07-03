
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Shift, InventoryStock } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock";
import { Camera } from "lucide-react";
import { formatCurrency } from "@/utils/format";

// Import the refactored components
import ShiftPhotoSection from "./shift/ShiftPhotoSection";
import EndingCashSection from "./shift/EndingCashSection";


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


  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setEndingCash(0);
      setPhoto(null);
      setShowCameraView(false);
      setCashError(null);
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
    
    // Double check cash validation
    if (endingCash < currentShift.startingCash) {
      setCashError(`Ending cash must be at least ${formatCurrency(currentShift.startingCash)} (starting cash amount)`);
      return;
    }
    
    await onEndShift(endingCash, photo || undefined);
    setShowCameraView(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setShowCameraView(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>End Current Shift</DialogTitle>
          <DialogDescription>
            Please count your cash drawer before ending your shift.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 flex-1 overflow-hidden">
          {/* Cash Section */}
          <EndingCashSection 
            endingCash={endingCash}
            setEndingCash={setEndingCash}
            currentShift={currentShift}
            cashError={cashError}
          />
          
          {/* Photo Section */}
          <ShiftPhotoSection 
            photo={photo}
            setPhoto={setPhoto}
            showCameraView={showCameraView}
            setShowCameraView={setShowCameraView}
          />
          
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!!cashError || !photo}
            className="flex items-center"
          >
            <Camera className="mr-2 h-4 w-4" />
            End Shift with Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
