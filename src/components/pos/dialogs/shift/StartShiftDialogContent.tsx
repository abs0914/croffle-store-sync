import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  startingInventoryCount: number;
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
  const {
    user
  } = useAuth();
  const [startingCash, setStartingCash] = useState<number>(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedCashierId, setSelectedCashierId] = useState<string | null>(null);
  const [showCameraView, setShowCameraView] = useState<boolean>(false);
  const [startingInventoryCount, setStartingInventoryCount] = useState<number>(0);

  // Fetch cashiers for the store
  const {
    data: cashiers = [],
    isLoading: isLoadingCashiers
  } = useQuery({
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
      isLoading: isLoadingCashiers,
      startingInventoryCount
    });
  }, [startingCash, photo, selectedCashierId, showCameraView, isLoadingCashiers, startingInventoryCount, onStateChange]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStartingCash(0);
      setPhoto(null);
      setSelectedCashierId(null);
      setShowCameraView(false);
      setStartingInventoryCount(0);
    }
  }, [isOpen]);
  return <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
      {/* Starting Cash Entry */}
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
          onChange={e => setStartingCash(parseFloat(e.target.value) || 0)} 
          placeholder="Enter starting cash amount" 
          className="text-lg p-3" 
          autoFocus 
        />
        <p className="text-sm text-muted-foreground">
          Count your cash drawer and enter the total amount
        </p>
      </div>

      {/* Cashier Selection */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          Select Cashier *
        </Label>
        <Select value={selectedCashierId || ""} onValueChange={setSelectedCashierId}>
          <SelectTrigger className="text-lg p-3">
            <SelectValue placeholder="Choose a cashier" />
          </SelectTrigger>
          <SelectContent>
            {cashiers.map((cashier) => (
              <SelectItem key={cashier.id} value={cashier.id}>
                {cashier.first_name} {cashier.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Select the cashier for this shift
        </p>
      </div>

      {/* Starting Inventory Count */}
      <div className="space-y-2">
        <Label htmlFor="startingInventoryCount" className="text-base font-medium">
          Starting Inventory Count
        </Label>
        <Input 
          id="startingInventoryCount" 
          type="number" 
          min="0" 
          value={startingInventoryCount} 
          onChange={e => setStartingInventoryCount(parseInt(e.target.value) || 0)} 
          placeholder="Enter total item count" 
          className="text-lg p-3" 
        />
        <p className="text-sm text-muted-foreground">
          Count total items in your inventory (optional)
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
        <p className="text-sm text-muted-foreground">Take a selfie to serve as your attendance</p>
      </div>
    </div>;
}