
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
import { fetchActiveCashiers } from "@/services/cashier";
import { Camera } from "lucide-react";
import { getPreviousShiftEndingCash } from "@/contexts/shift/shiftUtils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Import the components
import StartingCashSection from "./shift/StartingCashSection";
import ShiftPhotoSection from "./shift/ShiftPhotoSection";
import InventoryCountSection from "./shift/InventoryCountSection";
import CashierSelectSection from "./shift/CashierSelectSection";

interface StartShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStartShift: (startingCash: number, startInventoryCount: Record<string, number>, photo?: string, cashierId?: string) => Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedCashierId, setSelectedCashierId] = useState<string | null>(null);

  // Fetch inventory items for this store
  const { data: inventoryItems = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ["inventory-stock", storeId],
    queryFn: () => storeId ? fetchInventoryStock(storeId) : Promise.resolve([]),
    enabled: isOpen && !!storeId,
  });

  // Fetch cashiers for this store
  const { data: cashiers = [], isLoading: isLoadingCashiers } = useQuery({
    queryKey: ["active-cashiers", storeId],
    queryFn: () => storeId ? fetchActiveCashiers(storeId) : Promise.resolve([]),
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

  // Reset state when dialog closes and automatically show camera when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setPhoto(null);
      setInventoryCount({});
      setShowCameraView(false);
      setSelectedCashierId(null);
      setIsSubmitting(false);
    } else {
      // Automatically show camera view when dialog opens
      setShowCameraView(true);
    }
  }, [isOpen]);

  // Initialize inventory count with current stock quantities
  useEffect(() => {
    if (isOpen && inventoryItems.length > 0) {
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
    if (!storeId) {
      toast.error("No store selected");
      return;
    }
    
    if (!selectedCashierId) {
      toast.error("Please select a cashier");
      return;
    }
    
    if (!photo) {
      toast.error("Please take a photo of your cash drawer");
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log("Starting shift with params:", {
        startingCash,
        inventoryCount: Object.keys(inventoryCount).length,
        storeId,
        cashierId: selectedCashierId
      });
      
      await onStartShift(startingCash, inventoryCount, photo, selectedCashierId);
      setShowCameraView(false);
    } catch (error) {
      console.error("Error starting shift:", error);
      toast.error(`Failed to start shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
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
        
        <div className="space-y-4 py-4 flex-1 overflow-auto">
          {/* Cash Section */}
          <StartingCashSection 
            startingCash={startingCash}
            setStartingCash={setStartingCash}
            previousEndingCash={previousEndingCash}
            isLoading={isLoading}
          />
          
          {/* Cashier Section */}
          <CashierSelectSection 
            cashiers={cashiers}
            selectedCashierId={selectedCashierId}
            setSelectedCashierId={setSelectedCashierId}
            isLoading={isLoadingCashiers}
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
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!photo || !selectedCashierId || isSubmitting}
            className="flex items-center"
          >
            {isSubmitting ? (
              <>Submitting...</>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Start Shift with Photo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
