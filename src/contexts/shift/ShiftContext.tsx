
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Shift } from "@/types";
import { useAuth } from "../AuthContext";
import { useStore } from "../StoreContext";
import { ShiftState } from "./types";
import { createShift, closeShift, getActiveShift } from "./shiftUtils";

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
      return false;
    }
    
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
      return true;
    }
    return false;
  };
  
  const endShift = async (
    endingCash: number, 
    endInventoryCount: Record<string, number>,
    endPhoto?: string
  ): Promise<boolean> => {
    if (!currentShift) {
      return false;
    }
    
    const success = await closeShift(
      currentShift.id, 
      endingCash, 
      endInventoryCount,
      endPhoto
    );
    
    if (success) {
      setCurrentShift(null);
      return true;
    }
    return false;
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
