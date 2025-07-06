
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { fetchCashiers } from "@/services/cashier";
import { useAuth } from "@/contexts/auth";
import ShiftPhotoSection from "./ShiftPhotoSection";

interface DialogState {
  startingCash: number;
  photo: string | null;
  selectedCashierId: string | null;
  showCameraView: boolean;
  isLoading: boolean;
}

interface StartShiftDialogContentProps {
  isOpen: boolean;
  storeId: string | null;
  onStateChange: (state: DialogState) => void;
}

export default function StartShiftDialogContent({
  isOpen,
  storeId,
  onStateChange
}: StartShiftDialogContentProps) {
  const { user } = useAuth();
  const [startingCash, setStartingCash] = useState<number>(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedCashierId, setSelectedCashierId] = useState<string | null>(null);
  const [showCameraView, setShowCameraView] = useState<boolean>(false);

  // Fetch cashiers for the store
  const { data: cashiers = [], isLoading: isLoadingCashiers } = useQuery({
    queryKey: ["cashiers", storeId],
    queryFn: () => storeId ? fetchCashiers(storeId) : Promise.resolve([]),
    enabled: !!(isOpen && storeId)
  });

  // Auto-select current user's cashier record if available
  useEffect(() => {
    if (cashiers.length > 0 && user && !selectedCashierId) {
      const userCashier = cashiers.find(cashier => cashier.user_id === user.id);
      if (userCashier) {
        setSelectedCashierId(userCashier.id);
      } else if (cashiers.length === 1) {
        // If only one cashier, auto-select it
        setSelectedCashierId(cashiers[0].id);
      }
    }
  }, [cashiers, user, selectedCashierId]);

  // Update parent component whenever state changes
  useEffect(() => {
    onStateChange({
      startingCash,
      photo,
      selectedCashierId,
      showCameraView,
      isLoading: isLoadingCashiers
    });
  }, [startingCash, photo, selectedCashierId, showCameraView, isLoadingCashiers, onStateChange]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStartingCash(0);
      setPhoto(null);
      setSelectedCashierId(null);
      setShowCameraView(false);
    }
  }, [isOpen]);

  return (
    <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
      {/* Simplified Cash Entry */}
      <div className="space-y-2">
        <Label htmlFor="startingCash" className="text-base font-medium">
          Starting Cash Amount (₱) *
        </Label>
        <Input
          id="startingCash"
          type="number"
          min="0"
          step="0.01"
          value={startingCash}
          onChange={(e) => setStartingCash(parseFloat(e.target.value) || 0)}
          placeholder="Enter starting cash amount"
          className="text-lg p-3"
          autoFocus
        />
        <p className="text-sm text-muted-foreground">
          Count your cash drawer and enter the total amount
        </p>
      </div>

      {/* Required Photo Capture */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          Cash Drawer Photo *
        </Label>
        <ShiftPhotoSection 
          photo={photo}
          setPhoto={setPhoto}
          showCameraView={showCameraView}
          setShowCameraView={setShowCameraView}
        />
        <p className="text-sm text-muted-foreground">
          Take a photo of your cash drawer for audit purposes
        </p>
      </div>

      {/* Auto-Selected Cashier Info */}
      {selectedCashierId && (
        <div className="space-y-2">
          <Label className="text-base font-medium">Selected Cashier</Label>
          <div className="p-3 bg-muted rounded-md">
            {(() => {
              const selected = cashiers.find(c => c.id === selectedCashierId);
              return selected ? (
                <p className="font-medium">{selected.first_name} {selected.last_name}</p>
              ) : (
                <p className="text-muted-foreground">Auto-selected</p>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
