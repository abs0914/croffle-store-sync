
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Shift } from "@/types";
import { useAuth } from "./AuthContext";
import { useStore } from "./StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ShiftState {
  currentShift: Shift | null;
  isLoading: boolean;
  startShift: (startingCash: number, startPhoto?: string) => Promise<boolean>;
  endShift: (endingCash: number, endPhoto?: string) => Promise<boolean>;
  fetchActiveShift: () => Promise<void>;
}

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
      
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', currentStore.id)
        .eq('status', 'active')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setCurrentShift({
          id: data.id,
          userId: data.user_id,
          storeId: data.store_id,
          startTime: data.start_time,
          endTime: data.end_time,
          startingCash: data.starting_cash,
          endingCash: data.ending_cash,
          status: data.status,
          startPhoto: data.start_photo,
          endPhoto: data.end_photo,
          startInventoryCount: data.start_inventory_count,
          endInventoryCount: data.end_inventory_count
        });
      } else {
        setCurrentShift(null);
      }
    } catch (error) {
      console.error('Error fetching active shift:', error);
      toast.error('Failed to fetch active shift');
    } finally {
      setIsLoading(false);
    }
  };

  const startShift = async (startingCash: number, startPhoto?: string): Promise<boolean> => {
    if (!user || !currentStore) {
      toast.error('User or store not selected');
      return false;
    }
    
    try {
      const newShift = {
        user_id: user.id,
        store_id: currentStore.id,
        start_time: new Date().toISOString(),
        starting_cash: startingCash,
        status: 'active',
        start_photo: startPhoto
      };
      
      const { data, error } = await supabase
        .from('shifts')
        .insert(newShift)
        .select()
        .single();
      
      if (error) throw error;
      
      const shift: Shift = {
        id: data.id,
        userId: data.user_id,
        storeId: data.store_id,
        startTime: data.start_time,
        startingCash: data.starting_cash,
        status: 'active' as const,
        startPhoto: data.start_photo
      };
      
      setCurrentShift(shift);
      toast.success('Shift started successfully');
      return true;
    } catch (error) {
      console.error('Error starting shift:', error);
      toast.error('Failed to start shift');
      return false;
    }
  };
  
  const endShift = async (endingCash: number, endPhoto?: string): Promise<boolean> => {
    if (!currentShift) {
      toast.error('No active shift to end');
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          end_time: new Date().toISOString(),
          ending_cash: endingCash,
          status: 'closed',
          end_photo: endPhoto
        })
        .eq('id', currentShift.id);
      
      if (error) throw error;
      
      setCurrentShift(null);
      toast.success('Shift ended successfully');
      return true;
    } catch (error) {
      console.error('Error ending shift:', error);
      toast.error('Failed to end shift');
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
