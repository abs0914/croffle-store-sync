
import { ShiftType } from "@/types";

// This is our custom type for shifts table rows
export interface ShiftRow {
  id: string;
  user_id: string;
  store_id: string;
  start_time: string;
  end_time: string | null;
  starting_cash: number;
  ending_cash: number | null;
  status: 'active' | 'closed';
  start_photo: string | null;
  end_photo: string | null;
  start_inventory_count: Record<string, number> | null;
  end_inventory_count: Record<string, number> | null;
  created_at: string | null;
  cashier_id: string | null;
}

export interface ShiftState {
  currentShift: ShiftType | null;
  isLoading: boolean;
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
