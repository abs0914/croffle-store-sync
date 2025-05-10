
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
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock";
import { Camera } from "lucide-react";
import { getPreviousShiftEndingCash } from "@/contexts/shift/shiftUtils";
import { useAuth } from "@/contexts/AuthContext";

// Import the new components
import StartingCashSection from "./shift/StartingCashSection";
import ShiftPhotoSection from "./shift/ShiftPhotoSection";
import InventoryCountSection from "./shift/InventoryCountSection";

interface StartShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStartShift: (startingCash: number, startInventoryCount: Record<string, number>, photo?: string) => Promise<void>;
  storeId: string | null;
}

export default function StartShiftDialog({
  isOpen,
  onOpenChange,
  onStartShift,
  storeId
}: StartShiftDialogProps) {
  const { user } = useAuth();
  const [startingCash, setStartingCash] = useState<number>(0);
  const [previousEndingCash, setPreviousEndingCash] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [inventoryCount, setInventoryCount] = useState<Record<string, number>>({});
  const [showCameraView, setShowCameraView] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch inventory items for this store
  const { data: inventoryItems = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ["inventory-stock", storeId],
    queryFn: () => storeId ? fetchInventoryStock(storeId) : Promise.resolve([]),
    enabled: isOpen && !!storeId,
  });

  // Fetch previous shift ending cash when dialog opens
  useEffect(() => {
    if (isOpen && storeId && user) {
      setIsLoading(true);
      getPreviousShiftEndingCash(user.id, storeId)
        .then(cash => {
          setPreviousEndingCash(cash);
          setStartingCash(cash); // Set starting cash to previous ending cash
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, storeId, user]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPhoto(null);
      setInventoryCount({});
      setShowCameraView(false);
    } else if (isOpen && inventoryItems.length > 0) {
      // Initialize inventory count with current stock quantities
      const initialCount = inventoryItems.reduce((acc, item) => {
        acc[item.id] = item.stock_quantity || 0;
        return acc;
      }, {} as Record<string, number>);
      
      setInventoryCount(initialCount);
    }
  }, [isOpen, inventoryItems]);

  const handleInventoryCountChange = (itemId: string, value: number) => {
    setInventoryCount(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleSubmit = async () => {
    await onStartShift(startingCash, inventoryCount, photo || undefined);
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
          <DialogTitle>Start New Shift</DialogTitle>
          <DialogDescription>
            Please count your cash drawer and inventory levels before starting your shift.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 flex-1 overflow-hidden">
          {/* Cash Section */}
          <StartingCashSection 
            startingCash={startingCash}
            setStartingCash={setStartingCash}
            previousEndingCash={previousEndingCash}
            isLoading={isLoading}
          />
          
          {/* Photo Section */}
          <ShiftPhotoSection 
            photo={photo}
            setPhoto={setPhoto}
            showCameraView={showCameraView}
            setShowCameraView={setShowCameraView}
          />
          
          {/* Inventory Section */}
          <InventoryCountSection 
            inventoryItems={inventoryItems}
            inventoryCount={inventoryCount}
            handleInventoryCountChange={handleInventoryCountChange}
            isLoadingInventory={isLoadingInventory}
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!photo}
            className="flex items-center"
          >
            <Camera className="mr-2 h-4 w-4" />
            Start Shift with Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
