
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { ShiftType } from "@/types";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { ShiftState } from "./types";
import { createShift, closeShift, getActiveShift } from "./shiftUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const initialState: ShiftState = {
  currentShift: null,
  isLoading: true,
  startShift: async () => false,
  endShift: async () => false,
  fetchActiveShift: async () => {},
};

const ShiftContext = createContext<ShiftState>(initialState);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const [currentShift, setCurrentShift] = useState<ShiftType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active shift when user or store changes
  useEffect(() => {
    if (user && currentStore && session) {
      fetchActiveShift();
    } else {
      setCurrentShift(null);
      setIsLoading(false);
    }
  }, [user, currentStore, session]);

  const fetchActiveShift = async () => {
    if (!user || !currentStore || !session) return;

    try {
      setIsLoading(true);
      const shift = await getActiveShift(user.id, currentStore.id);
      setCurrentShift(shift);
    } catch (error) {
      console.error('Error fetching active shift:', error);
      toast.error('Failed to fetch active shift');
    } finally {
      setIsLoading(false);
    }
  };

  const startShift = async (
    startingCash: number,
    startPhoto?: string,
    cashierId?: string,
    inventoryCounts?: Record<string, number>
  ): Promise<boolean> => {
    if (!user || !currentStore) {
      toast.error("Missing user or store information");
      return false;
    }

    // Streamlined validation - require photo
    if (!startPhoto) {
      toast.error("Photo is required to start shift");
      return false;
    }

    try {
      // Verify authentication status before attempting to create a shift
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession) {
        toast.error("Authentication required - please log in again");
        return false;
      }

      console.log(`🚀 Starting streamlined shift for store: ${currentStore.id} with user: ${user.id}`, {
        inventoryItemCount: inventoryCounts ? Object.keys(inventoryCounts).length : 0,
        totalInventoryCount: inventoryCounts ? Object.values(inventoryCounts).reduce((sum, count) => sum + count, 0) : 0
      });

      const shift = await createShift(
        user.id,
        currentStore.id,
        startingCash,
        startPhoto, // Required photo
        cashierId,
        inventoryCounts
      );

      if (shift) {
        setCurrentShift(shift);
        toast.success("Shift started successfully! 🎉");
        return true;
      } else {
        toast.error("Failed to create shift - check your permissions");
        return false;
      }
    } catch (error) {
      console.error("Error in startShift:", error);

      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('JWT') || error.message.includes('auth') || error.message.includes('token')) {
          toast.error("Authentication expired - please log in again");
        } else if (error.message.includes('permission denied') || error.message.includes('403')) {
          toast.error("Permission denied - you don't have access to create shifts");
        } else {
          toast.error(`Failed to start shift: ${error.message}`);
        }
      } else {
        toast.error("Failed to start shift - unknown error");
      }

      return false;
    }
  };

  const endShift = async (
    endingCash: number,
    endPhoto?: string
  ): Promise<boolean> => {
    if (!currentShift) {
      toast.error("No active shift to end");
      return false;
    }

    // Streamlined validation - require photo
    if (!endPhoto) {
      toast.error("Photo is required to end shift");
      return false;
    }

    try {
      // Verify authentication status before attempting to end the shift
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession) {
        toast.error("Authentication required - please log in again");
        return false;
      }

      console.log(`🏁 Ending streamlined shift with auto-generated inventory report`);

      const success = await closeShift(
        currentShift.id,
        endingCash,
        endPhoto, // Required photo
        queryClient
      );

      if (success) {
        setCurrentShift(null);
        toast.success("Shift ended successfully! 📊 Inventory report generated automatically.");
        return true;
      } else {
        toast.error("Failed to end shift");
        return false;
      }
    } catch (error) {
      console.error("Error ending shift:", error);

      if (error instanceof Error) {
        if (error.message.includes('JWT') || error.message.includes('auth') || error.message.includes('token')) {
          toast.error("Authentication expired - please log in again");
        } else if (error.message.includes('permission denied')) {
          toast.error("Permission denied - you don't have access to end this shift");
        } else {
          toast.error(`Failed to end shift: ${error.message}`);
        }
      } else {
        toast.error("Failed to end shift: unknown error");
      }

      return false;
    }
  };

  return (
    <ShiftContext.Provider
      value={{
        currentShift,
        isLoading,
        startShift,
        endShift,
        fetchActiveShift
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
}

export const useShift = () => useContext(ShiftContext);
