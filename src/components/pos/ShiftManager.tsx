
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useShift } from "@/contexts/shift"; 
import { useStore } from "@/contexts/StoreContext";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import StartShiftDialog from "./dialogs/StartShiftDialog";
import EndShiftDialog from "./dialogs/EndShiftDialog";
import ActiveCashierDisplay from "./ActiveCashierDisplay";
import { fetchCashierById } from "@/services/cashier";
import { toast } from "sonner";

export default function ShiftManager() {
  const { currentShift, startShift, endShift } = useShift();
  const { currentStore } = useStore();
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);
  const [isStartingShift, setIsStartingShift] = useState(false);
  const [isEndingShift, setIsEndingShift] = useState(false);

  // Fetch cashier details if available
  const { data: cashier } = useQuery({
    queryKey: ["cashier", currentShift?.cashier_id],
    queryFn: () => currentShift?.cashier_id ? fetchCashierById(currentShift.cashier_id) : Promise.resolve(null),
    enabled: !!currentShift?.cashier_id
  });

  const handleStartShift = async (
    startingCash: number, 
    startInventoryCount: Record<string, number>, 
    photo?: string,
    cashierId?: string
  ) => {
    if (!currentStore) {
      toast.error("Please select a store first");
      return;
    }
    
    try {
      setIsStartingShift(true);
      console.log("About to call startShift with", {
        cashValue: startingCash, 
        inventoryCount: Object.keys(startInventoryCount).length + " items",
        hasPhoto: !!photo,
        cashierId
      });
      
      const success = await startShift(startingCash, startInventoryCount, photo, cashierId);
      
      if (success) {
        setIsStartShiftOpen(false);
        toast.success("Shift started successfully");
      } else {
        toast.error("Failed to start shift - please try again");
      }
    } catch (error) {
      console.error("Error in handleStartShift:", error);
      toast.error(`Failed to start shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStartingShift(false);
    }
  };

  const handleEndShift = async (
    endingCash: number, 
    endInventoryCount: Record<string, number>, 
    photo?: string
  ) => {
    if (!currentShift) return;
    
    try {
      setIsEndingShift(true);
      const success = await endShift(endingCash, endInventoryCount, photo);
      
      if (success) {
        setIsEndShiftOpen(false);
        toast.success("Shift ended successfully");
      } else {
        toast.error("Failed to end shift - please try again");
      }
    } catch (error) {
      console.error("Error ending shift:", error);
      toast.error(`Failed to end shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsEndingShift(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Shift Management</span>
          {currentShift && (
            <ActiveCashierDisplay 
              cashierId={currentShift.cashier_id} 
              className="text-sm"
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentShift ? (
          <div className="space-y-4">
            <div>
              <p className="font-medium text-sm">Active Shift</p>
              <p>Started: {format(new Date(currentShift.startTime), "MMM dd, yyyy h:mm a")}</p>
              <p>Starting Cash: ₱{currentShift.startingCash.toFixed(2)}</p>
              {cashier && (
                <p>Cashier: {cashier.fullName}</p>
              )}
            </div>
            
            <EndShiftDialog
              isOpen={isEndShiftOpen}
              onOpenChange={setIsEndShiftOpen}
              currentShift={currentShift}
              onEndShift={handleEndShift}
            />
            
            <Button 
              className="w-full mt-2 bg-red-500 hover:bg-red-600"
              onClick={() => setIsEndShiftOpen(true)}
              disabled={isEndingShift}
            >
              {isEndingShift ? "Processing..." : "End Shift"}
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground mb-2">No active shift. Start a shift to begin processing transactions.</p>
            
            <StartShiftDialog
              isOpen={isStartShiftOpen}
              onOpenChange={setIsStartShiftOpen}
              onStartShift={handleStartShift}
              storeId={currentStore?.id || null}
            />
            
            <Button 
              className="w-full"
              onClick={() => setIsStartShiftOpen(true)}
              disabled={isStartingShift || !currentStore}
            >
              {isStartingShift ? "Processing..." : "Start Shift"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
