import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Shift } from "@/types";
import { useAuth } from "../AuthContext";
import { useStore } from "../StoreContext";
import { ShiftState } from "./types";
import { createShift, closeShift, getActiveShift } from "./shiftUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const initialState: ShiftState = {
  currentShift: null,
  isLoading: true,
  startShift: async () => false,
  endShift: async () => false,
  fetchActiveShift: async () => {},
};

const ShiftContext = createContext<ShiftState>(initialState);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active shift when user or store changes
  useEffect(() => {
    if (user && currentStore) {
      fetchActiveShift();
    } else {
      setCurrentShift(null);
      setIsLoading(false);
    }
  }, [user, currentStore]);

  const fetchActiveShift = async () => {
    if (!user || !currentStore) return;
    
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
    startInventoryCount: Record<string, number>,
    startPhoto?: string,
    cashierId?: string
  ): Promise<boolean> => {
    if (!user || !currentStore) {
      toast.error("Missing user or store information");
      return false;
    }
    
    try {
      console.log(`Starting shift for store: ${currentStore.id} with user: ${user.id}`);
      console.log("Authorization status:", supabase?.auth?.session ? "Authenticated" : "Not authenticated");
      
      const shift = await createShift(
        user.id, 
        currentStore.id, 
        startingCash, 
        startInventoryCount,
        startPhoto,
        cashierId
      );
      
      if (shift) {
        setCurrentShift(shift);
        toast.success("Shift started successfully");
        return true;
      } else {
        toast.error("Failed to create shift - check database permissions");
        console.error("Create shift returned null");
        return false;
      }
    } catch (error) {
      console.error("Error in startShift:", error);
      toast.error(`Failed to start shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };
  
  const endShift = async (
    endingCash: number, 
    endInventoryCount: Record<string, number>,
    endPhoto?: string
  ): Promise<boolean> => {
    if (!currentShift) {
      toast.error("No active shift to end");
      return false;
    }
    
    try {
      const success = await closeShift(
        currentShift.id, 
        endingCash, 
        endInventoryCount,
        endPhoto
      );
      
      if (success) {
        setCurrentShift(null);
        toast.success("Shift ended successfully");
        return true;
      } else {
        toast.error("Failed to end shift");
        return false;
      }
    } catch (error) {
      console.error("Error ending shift:", error);
      toast.error(`Failed to end shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
