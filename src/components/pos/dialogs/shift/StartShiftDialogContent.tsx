import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import ShiftPhotoSection from "./ShiftPhotoSection";
import InventoryItemsList from "./InventoryItemsList";
interface DialogState {
  startingCash: number;
  photo: string | null;
  selectedCashierId: string | null;
  showCameraView: boolean;
  isLoading: boolean;
  inventoryCounts: Record<string, number>;
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
  const [showCameraView, setShowCameraView] = useState<boolean>(false);
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, number>>({});

  // Auto-select current user as cashier
  const selectedCashierId = user?.id || null;

  // Update parent component whenever state changes
  useEffect(() => {
    onStateChange({
      startingCash,
      photo,
      selectedCashierId,
      showCameraView,
      isLoading: false,
      inventoryCounts
    });
  }, [startingCash, photo, selectedCashierId, showCameraView, inventoryCounts, onStateChange]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStartingCash(0);
      setPhoto(null);
      setShowCameraView(false);
      setInventoryCounts({});
    }
  }, [isOpen]);
  return (
    <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
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

      {/* Logged-in Cashier Display */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          Cashier
        </Label>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">
                  {user?.email?.split('@')[0] || 'Current User'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {user?.email}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">
          You are logged in as the cashier for this shift
        </p>
      </div>

      {/* Inventory Items List */}
      <InventoryItemsList 
        storeId={storeId}
        onInventoryCountChange={setInventoryCounts}
      />

      {/* Required Photo Capture */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          Shift Photo *
        </Label>
        <ShiftPhotoSection 
          photo={photo} 
          setPhoto={setPhoto} 
          showCameraView={showCameraView} 
          setShowCameraView={setShowCameraView} 
        />
        <p className="text-sm text-muted-foreground">Take a photo to document the start of your shift</p>
      </div>
    </div>
  );
}