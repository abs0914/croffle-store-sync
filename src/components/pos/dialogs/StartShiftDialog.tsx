
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Store } from "@/types";
import { Cashier } from "@/types/cashier";
import { InventoryStock } from "@/types";
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
  onStartShift: (startingCash: number, cashierId: string | null, inventoryCount: Record<string, number>, photo?: string) => Promise<void>;
  storeId: string | null;
  currentStore?: Store | null;
  cashiers?: Cashier[];
  loading?: boolean;
}

export default function StartShiftDialog({
  isOpen,
  onOpenChange,
  onStartShift,
  storeId,
  currentStore,
  cashiers = [],
  loading = false
}: StartShiftDialogProps) {
  const [startingCash, setStartingCash] = useState<number>(0);
  const [selectedCashierId, setSelectedCashierId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [inventoryCount, setInventoryCount] = useState<Record<string, number>>({});
  const [showCameraView, setShowCameraView] = useState<boolean>(false);
  const [previousEndingCash, setPreviousEndingCash] = useState<number | null>(null);
  const [isLoadingPreviousCash, setIsLoadingPreviousCash] = useState<boolean>(false);
  
  // Add dialog stability tracking
  const [dialogStable, setDialogStable] = useState<boolean>(false);
  const initialDataProcessedRef = useRef<boolean>(false);

  // Fetch inventory items for this store
  const { 
    data: inventoryItems = [], 
    isLoading: isLoadingInventory,
    error: inventoryError
  } = useQuery({
    queryKey: ["inventory-stock", storeId],
    queryFn: () => storeId ? fetchInventoryStock(storeId) : Promise.resolve([]),
    enabled: isOpen && !!storeId,
    retry: 2
  });

  // Mark dialog as stable after a delay
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setDialogStable(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDialogStable(false);
      initialDataProcessedRef.current = false;
    }
  }, [isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStartingCash(0);
      setSelectedCashierId(null);
      setPhoto(null);
      setInventoryCount({});
      setShowCameraView(false);
    }
  }, [isOpen]);

  // Process inventory data when it loads, but only once
  useEffect(() => {
    if (dialogStable && isOpen && inventoryItems.length > 0 && !initialDataProcessedRef.current) {
      // Initialize inventory count with current stock quantities
      const initialCount = inventoryItems.reduce((acc, item) => {
        acc[item.id] = item.stock_quantity || 0;
        return acc;
      }, {} as Record<string, number>);
      
      setInventoryCount(initialCount);
      initialDataProcessedRef.current = true;
    }
  }, [dialogStable, isOpen, inventoryItems]);

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
            previousEndingCash={previousEndingCash}
            isLoading={isLoadingPreviousCash}
          />
          
          {/* Cashier Selection - if multiple cashiers */}
          {cashiers.length > 0 && (
            <CashierSelectSection 
              cashiers={cashiers}
              selectedCashierId={selectedCashierId}
              setSelectedCashierId={setSelectedCashierId}
              isLoading={loading}
            />
          )}
          
          {/* Photo Section */}
          {dialogStable && (
            <ShiftPhotoSection 
              photo={photo}
              setPhoto={setPhoto}
              showCameraView={showCameraView}
              setShowCameraView={setShowCameraView}
            />
          )}
          
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
