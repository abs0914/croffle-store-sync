
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock/inventoryStockFetch";
import { fetchActiveCashiers } from "@/services/cashier";
import { getPreviousShiftEndingCash } from "@/contexts/shift/shiftUtils";
import { useAuth } from "@/contexts/auth";

import StartingCashSection from "./StartingCashSection";
import ShiftPhotoSection from "./ShiftPhotoSection";
import InventoryCountSection from "./InventoryCountSection";
import StoreInfoSection from "./StoreInfoSection";
import EnhancedCashierSelector from "./EnhancedCashierSelector";

interface StartShiftDialogContentProps {
  isOpen: boolean;
  storeId: string | null;
  onStateChange: (state: {
    startingCash: number;
    photo: string | null;
    inventoryCount: Record<string, number>;
    selectedCashierId: string | null;
    showCameraView: boolean;
    isLoading: boolean;
  }) => void;
}

export default function StartShiftDialogContent({
  isOpen,
  storeId,
  onStateChange
}: StartShiftDialogContentProps) {
  const { user } = useAuth();
  const [startingCash, setStartingCash] = useState<number>(0);
  const [previousEndingCash, setPreviousEndingCash] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [inventoryCount, setInventoryCount] = useState<Record<string, number>>({});
  const [showCameraView, setShowCameraView] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCashierId, setSelectedCashierId] = useState<string | null>(null);

  // Fetch inventory items for this store
  const { data: inventoryItems = [], isLoading: isLoadingInventory, error: inventoryError } = useQuery({
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
          setStartingCash(cash);
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
    } else {
      setShowCameraView(true);
    }
  }, [isOpen]);

  // Auto-select cashier based on user role and available cashiers
  useEffect(() => {
    if (isOpen && cashiers.length > 0 && !selectedCashierId) {
      const currentUserCashier = cashiers.find(cashier => cashier.userId === user?.id);
      
      if (currentUserCashier) {
        const cashierIdToUse = currentUserCashier.userId ? `app_user:${currentUserCashier.id}` : currentUserCashier.id;
        setSelectedCashierId(cashierIdToUse);
      } else if (user?.role === 'manager' || user?.role === 'admin') {
        setSelectedCashierId(null);
      }
    }
  }, [isOpen, cashiers, selectedCashierId, user]);

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

  // Update parent component when state changes
  useEffect(() => {
    onStateChange({
      startingCash,
      photo,
      inventoryCount,
      selectedCashierId,
      showCameraView,
      isLoading
    });
  }, [startingCash, photo, inventoryCount, selectedCashierId, showCameraView, isLoading, onStateChange]);

  const handleInventoryCountChange = (itemId: string, value: number) => {
    setInventoryCount(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  return (
    <div className="space-y-4 py-4 flex-1 overflow-auto">
      {/* Store Information Section */}
      <StoreInfoSection storeId={storeId} />
      
      {/* Cash Section */}
      <StartingCashSection 
        startingCash={startingCash}
        setStartingCash={setStartingCash}
        previousEndingCash={previousEndingCash}
        isLoading={isLoading}
      />
      
      {/* Enhanced Cashier Section */}
      <EnhancedCashierSelector 
        cashiers={cashiers}
        selectedCashierId={selectedCashierId}
        setSelectedCashierId={setSelectedCashierId}
        isLoading={isLoadingCashiers}
        allowSelection={true}
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
      
      {/* Debug info when no inventory items */}
      {isOpen && !isLoadingInventory && inventoryItems.length === 0 && (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border">
          No inventory items found for this store. You may need to add inventory items first.
        </div>
      )}
    </div>
  );
}
