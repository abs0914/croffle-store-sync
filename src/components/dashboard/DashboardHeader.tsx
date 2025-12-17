import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useShift } from "@/contexts/shift";
import { useStore } from "@/contexts/StoreContext";
import StartShiftDialog from "@/components/pos/dialogs/StartShiftDialog";
import { toast } from "sonner";
import { getAppVersionDisplay } from "@/config/appVersion";

export function DashboardHeader() {
  const [showStartDialog, setShowStartDialog] = useState(false);
  const { currentShift, isLoading, startShift } = useShift();
  const { currentStore } = useStore();

  const handleStartShift = async (startingCash: number, photo?: string, cashierId?: string) => {
    try {
      const success = await startShift(startingCash, photo, cashierId);
      if (success) {
        setShowStartDialog(false);
        toast.success("Shift started successfully!");
      }
    } catch (error) {
      console.error("Failed to start shift:", error);
      toast.error("Failed to start shift. Please try again.");
    }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-croffle-primary">Dashboard</h1>
          <span className="text-xs text-muted-foreground">{getAppVersionDisplay()}</span>
        </div>
        {currentShift ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              Shift Active
            </span>
          </div>
        ) : (
          <Button 
            onClick={() => setShowStartDialog(true)}
            className="bg-croffle-accent hover:bg-croffle-accent/90"
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Start POS Shift"}
          </Button>
        )}
      </div>

      <StartShiftDialog
        isOpen={showStartDialog}
        onOpenChange={setShowStartDialog}
        onStartShift={handleStartShift}
        storeId={currentStore?.id || null}
      />
    </>
  );
}
