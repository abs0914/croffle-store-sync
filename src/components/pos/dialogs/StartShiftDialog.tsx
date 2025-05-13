
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
import { Store, Cashier, InventoryStock } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock";
import { Camera } from "lucide-react";

// Import the refactored components
import ShiftPhotoSection from "./shift/ShiftPhotoSection";
import StartingCashSection from "./shift/StartingCashSection";
import CashierSelectSection from "./shift/CashierSelectSection";
import InventoryCountSection from "./shift/InventoryCountSection";

interface StartShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentStore: Store | null;
  cashiers: Cashier[];
  onStartShift: (startingCash: number, cashierId: string | null, inventoryCount: Record<string, number>, photo?: string) => Promise<void>;
  loading: boolean;
}

export default function StartShiftDialog({
  isOpen,
  onOpenChange,
  currentStore,
  cashiers,
  onStartShift,
  loading
}: StartShiftDialogProps) {
  const [startingCash, setStartingCash] = useState<number>(0);
  const [selectedCashierId, setSelectedCashierId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [inventoryCount, setInventoryCount] = useState<Record<string, number>>({});
  const [showCameraView, setShowCameraView] = useState<boolean>(false);

  // Fetch inventory items for this store
  const { 
    data: inventoryItems = [], 
    isLoading: isLoadingInventory,
    error: inventoryError
  } = useQuery({
    queryKey: ["inventory-stock", currentStore?.id],
    queryFn: () => currentStore?.id ? fetchInventoryStock(currentStore.id) : Promise.resolve([]),
    enabled: isOpen && !!currentStore?.id,
    retry: 2
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStartingCash(0);
      setSelectedCashierId(null);
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
    await onStartShift(startingCash, selectedCashierId, inventoryCount, photo || undefined);
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
            Please enter your starting cash and take a photo of the cash drawer
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 flex-1 overflow-hidden">
          {/* Cash Section */}
          <StartingCashSection 
            startingCash={startingCash}
            setStartingCash={setStartingCash}
          />
          
          {/* Cashier Selection - if multiple cashiers */}
          {cashiers.length > 0 && (
            <CashierSelectSection 
              cashiers={cashiers}
              selectedCashierId={selectedCashierId}
              setSelectedCashierId={setSelectedCashierId}
            />
          )}
          
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
            error={inventoryError}
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !photo}
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
