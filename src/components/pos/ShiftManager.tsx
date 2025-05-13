
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useShift } from "@/contexts/shift"; 
import { useStore } from "@/contexts/StoreContext";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import StartShiftDialog from "./dialogs/StartShiftDialog";
import EndShiftDialog from "./dialogs/EndShiftDialog";
import { fetchCashierById } from "@/services/cashier";

export default function ShiftManager() {
  const { currentShift, startShift, endShift } = useShift();
  const { currentStore } = useStore();
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);

  // Fetch cashier details if available
  const { data: cashier } = useQuery({
    queryKey: ["cashier", currentShift?.cashierId],
    queryFn: () => currentShift?.cashierId ? fetchCashierById(currentShift.cashierId) : Promise.resolve(null),
    enabled: !!currentShift?.cashierId
  });

  const handleStartShift = async (
    startingCash: number, 
    cashierId: string | null, 
    startInventoryCount: Record<string, number>, 
    photo?: string
  ) => {
    const success = await startShift(startingCash, startInventoryCount, photo, cashierId);
    if (success) {
      setIsStartShiftOpen(false);
    }
  };

  const handleEndShift = async (
    endingCash: number, 
    endInventoryCount: Record<string, number>, 
    photo?: string
  ) => {
    if (!currentShift) return;
    
    const success = await endShift(endingCash, endInventoryCount, photo);
    if (success) {
      setIsEndShiftOpen(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">Shift Management</CardTitle>
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
            >
              End Shift
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
            >
              Start Shift
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
