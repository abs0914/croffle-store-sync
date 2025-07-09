
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useShift } from "@/contexts/shift";
import { useStore } from "@/contexts/StoreContext";
import { designClass } from "@/utils/designSystem";
import EndShiftDialog from "@/components/pos/dialogs/EndShiftDialog";
import StartShiftDialog from "@/components/pos/dialogs/StartShiftDialog";
import { toast } from "sonner";

export const StartShiftButton: React.FC = () => {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { currentShift, startShift, endShift, isLoading } = useShift();
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);
  const [isEndingShift, setIsEndingShift] = useState(false);

  // Debug logging (can be removed in production)
  console.log('StartShiftButton render:', {
    currentShift: currentShift ? 'Active' : 'None',
    isLoading,
    shiftId: currentShift?.id
  });

  const handleStartShift = async (
    startingCash: number,
    photo?: string,
    cashierId?: string
  ) => {
    if (!currentStore) {
      toast.error("Please select a store first");
      return;
    }

    try {
      const success = await startShift(startingCash, photo, cashierId);

      if (success) {
        setIsStartShiftOpen(false);
        toast.success("Shift started successfully");
        navigate("/pos");
      } else {
        toast.error("Failed to start shift - please try again");
      }
    } catch (error) {
      console.error("Error starting shift:", error);
      toast.error(`Failed to start shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEndShift = async (
    endingCash: number,
    photo?: string
  ) => {
    if (!currentShift) return;

    try {
      setIsEndingShift(true);
      const success = await endShift(endingCash, photo);

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
    <div className="px-3 py-4">
      {isLoading ? (
        <Button
          className="w-full bg-gray-400 text-white rounded-md py-3"
          disabled
        >
          Loading...
        </Button>
      ) : currentShift ? (
        <>
          <EndShiftDialog
            isOpen={isEndShiftOpen}
            onOpenChange={setIsEndShiftOpen}
            currentShift={currentShift}
            onEndShift={handleEndShift}
          />
          <Button
            className="w-full bg-red-500 hover:bg-red-600 text-white rounded-md py-3"
            onClick={() => setIsEndShiftOpen(true)}
            disabled={isEndingShift}
          >
            {isEndingShift ? "Processing..." : "End Shift"}
          </Button>
        </>
      ) : (
        <>
          <StartShiftDialog
            isOpen={isStartShiftOpen}
            onOpenChange={setIsStartShiftOpen}
            onStartShift={handleStartShift}
            storeId={currentStore?.id || null}
          />
          <Button
            className="w-full bg-croffle-accent hover:bg-croffle-accent/90 text-white rounded-md py-3"
            onClick={() => setIsStartShiftOpen(true)}
          >
            Start Shift
          </Button>
        </>
      )}
    </div>
  );
};
