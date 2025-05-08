
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useShift } from "@/contexts/shift"; // Updated import path
import { format } from "date-fns";
import StartShiftDialog from "./dialogs/StartShiftDialog";
import EndShiftDialog from "./dialogs/EndShiftDialog";

export default function ShiftManager() {
  const { currentShift, startShift, endShift } = useShift();
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);

  const handleStartShift = async (startingCash: number, photo?: string) => {
    const success = await startShift(startingCash, photo);
    if (success) {
      setIsStartShiftOpen(false);
    }
  };

  const handleEndShift = async (endingCash: number, photo?: string) => {
    if (!currentShift) return;
    
    const success = await endShift(endingCash, photo);
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
