
import { Shift } from "@/types";

export interface ShiftState {
  currentShift: Shift | null;
  isLoading: boolean;
  error?: string | null;
  startShift: (
    startingCash: number, 
    startInventoryCount: Record<string, number>,
    startPhoto?: string,
    cashierId?: string
  ) => Promise<boolean>;
  endShift: (
    endingCash: number, 
    endInventoryCount: Record<string, number>,
    endPhoto?: string
  ) => Promise<boolean>;
  fetchActiveShift: () => Promise<void>;
}

export interface ShiftRow {
  id: string;
  user_id: string;
  store_id: string;
  start_time: string;
  end_time?: string;
  starting_cash: number;
  ending_cash?: number;
  status: 'active' | 'closed';
  start_photo?: string;
  end_photo?: string;
  start_inventory_count?: Record<string, number>;
  end_inventory_count?: Record<string, number>;
  cashier_id?: string;
}
