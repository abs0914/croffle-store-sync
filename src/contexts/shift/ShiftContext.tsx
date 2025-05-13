
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Shift } from "@/types";
import { useAuth } from "../AuthContext";
import { useStore } from "../StoreContext";
import { ShiftState } from "./types";
import { createShift, closeShift, getActiveShift, getPreviousShiftEndingCash } from "./shiftUtils";
import { toast } from "sonner";

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
  const [error, setError] = useState<string | null>(null);

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
    if (!user || !currentStore) {
      setError("No user or store selected");
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const shift = await getActiveShift(user.id, currentStore.id);
      setCurrentShift(shift);
    } catch (error) {
      console.error('Error fetching active shift:', error);
      setError("Failed to retrieve active shift status");
      toast.error("Failed to retrieve active shift status");
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
      toast.error("No user or store selected");
      return false;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
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
      }
      
      throw new Error("Failed to start shift");
    } catch (error: any) {
      console.error('Error starting shift:', error);
      setError(error?.message || "Failed to start shift");
      toast.error(error?.message || "Failed to start shift");
      return false;
    } finally {
      setIsLoading(false);
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
      setIsLoading(true);
      setError(null);
      
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
      }
      
      throw new Error("Failed to end shift");
    } catch (error: any) {
      console.error('Error ending shift:', error);
      setError(error?.message || "Failed to end shift");
      toast.error(error?.message || "Failed to end shift");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ShiftContext.Provider
      value={{
        currentShift,
        isLoading,
        error,
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
