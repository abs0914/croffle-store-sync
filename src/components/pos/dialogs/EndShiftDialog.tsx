
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
import { Shift, InventoryStock } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock";
import { Camera } from "lucide-react";

// Import the refactored components
import ShiftPhotoSection from "./shift/ShiftPhotoSection";
import EndingCashSection from "./shift/EndingCashSection";
import EndShiftInventorySection from "./shift/EndShiftInventorySection";

interface EndShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentShift: Shift | null;
  onEndShift: (endingCash: number, endInventoryCount: Record<string, number>, photo?: string) => Promise<void>;
}

export default function EndShiftDialog({
  isOpen,
  onOpenChange,
  currentShift,
  onEndShift
}: EndShiftDialogProps) {
  const [endingCash, setEndingCash] = useState<number>(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [inventoryCount, setInventoryCount] = useState<Record<string, number>>({});
  const [showCameraView, setShowCameraView] = useState<boolean>(false);
  const [cashError, setCashError] = useState<string | null>(null);

  // Fetch inventory items for this store
  const { data: inventoryItems = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ["inventory-stock", currentShift?.storeId],
    queryFn: () => currentShift?.storeId ? fetchInventoryStock(currentShift.storeId) : Promise.resolve([]),
    enabled: isOpen && !!currentShift?.storeId,
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setEndingCash(0);
      setPhoto(null);
      setInventoryCount({});
      setShowCameraView(false);
      setCashError(null);
    } else if (isOpen && inventoryItems.length > 0) {
      // Initialize inventory count with current stock quantities
      const initialCount = inventoryItems.reduce((acc, item) => {
        acc[item.id] = item.stock_quantity || 0;
        return acc;
      }, {} as Record<string, number>);
      
      setInventoryCount(initialCount);
      
      // Set ending cash to at least the starting cash amount
      if (currentShift?.startingCash) {
        setEndingCash(currentShift.startingCash);
      }
    }
  }, [isOpen, inventoryItems, currentShift]);

  // Validate ending cash amount whenever it changes
  useEffect(() => {
    if (currentShift && endingCash < currentShift.startingCash) {
      setCashError(`Ending cash must be at least ${currentShift.startingCash.toFixed(2)} (starting cash amount)`);
    } else {
      setCashError(null);
    }
  }, [endingCash, currentShift]);

  const handleInventoryCountChange = (itemId: string, value: number) => {
    setInventoryCount(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!currentShift) return;
    
    // Double check cash validation
    if (endingCash < currentShift.startingCash) {
      setCashError(`Ending cash must be at least ${currentShift.startingCash.toFixed(2)} (starting cash amount)`);
      return;
    }
    
    await onEndShift(endingCash, inventoryCount, photo || undefined);
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
            Please count your cash drawer and inventory levels before ending your shift.
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
          
          {/* Inventory Section */}
          <EndShiftInventorySection 
            inventoryItems={inventoryItems}
            inventoryCount={inventoryCount}
            handleInventoryCountChange={handleInventoryCountChange}
            isLoadingInventory={isLoadingInventory}
            currentShift={currentShift}
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
