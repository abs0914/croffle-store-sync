import { supabase } from "@/integrations/supabase/client";
import { Shift } from "@/types/shift";
import { ShiftRow } from "./types";
import { toast } from "sonner";
import { debugInventoryPermissions, checkInventoryAccess, updateInventoryStockWithRetry } from "@/services/inventoryStock/inventoryStockDebug";
import { QueryClient } from "@tanstack/react-query";

// Map from ShiftRow to Shift model
export function mapShiftRowToShift(shiftData: ShiftRow): Shift {
  return {
    id: shiftData.id,
    userId: shiftData.user_id,
    storeId: shiftData.store_id,
    startTime: shiftData.start_time,
    endTime: shiftData.end_time || undefined,
    startingCash: shiftData.starting_cash,
    endingCash: shiftData.ending_cash || undefined,
    status: shiftData.status,
    startPhoto: shiftData.start_photo || undefined,
    endPhoto: shiftData.end_photo || undefined,
    startInventoryCount: shiftData.start_inventory_count || undefined,
    endInventoryCount: shiftData.end_inventory_count || undefined,
    cashier_id: shiftData.cashier_id || undefined
  };
}

// Helper function to safely convert Json to Record<string, number>
function convertJsonToInventoryCount(json: any): Record<string, number> {
  if (!json || typeof json !== 'object') {
    return {};
  }

  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(json)) {
    if (typeof value === 'number') {
      result[key] = value;
    } else if (typeof value === 'string' && !isNaN(Number(value))) {
      result[key] = Number(value);
    }
  }

  return result;
}

// Create a new shift
export async function createShift(
  userId: string,
  storeId: string,
  startingCash: number,
  startPhoto?: string,
  cashierId?: string
): Promise<Shift | null> {
  try {
    // Verify authentication status
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    console.log("Creating shift with params:", {
      userId, storeId, startingCash, cashierId
    });

    // Handle cashier ID - only use it if it's from the legacy cashiers table
    let finalCashierId: string | null = null;
    if (cashierId) {
      if (cashierId.startsWith('app_user:')) {
        // This is from app_users table, don't set cashier_id (foreign key constraint)
        console.log("Cashier is from app_users table, not setting cashier_id foreign key");
        finalCashierId = null;
      } else {
        // This is from legacy cashiers table, safe to use
        console.log("Cashier is from legacy cashiers table, setting cashier_id");
        finalCashierId = cashierId;
      }
    }

    const newShift = {
      user_id: userId,
      store_id: storeId,
      start_time: new Date().toISOString(),
      starting_cash: startingCash,
      status: 'active',
      start_photo: startPhoto,
      cashier_id: finalCashierId
    };

    const { data, error } = await supabase
      .from('shifts')
      .insert(newShift)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating shift:", error);

      if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('violates row-level security policy')) {
        console.error("Permission denied error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error('Permission denied: You do not have access to create shifts');
      }

      throw error;
    }

    if (!data) {
      console.error("No data returned when creating shift");
      throw new Error('No data returned when creating shift');
    }

    console.log("Shift created successfully:", data);

    // Type assertion to ShiftRow
    const shiftData = data as unknown as ShiftRow;
    return mapShiftRowToShift(shiftData);
  } catch (error) {
    console.error('Error creating shift:', error);
    // Let the calling function handle the error
    throw error;
  }
}

// End an active shift
export async function closeShift(
  shiftId: string,
  endingCash: number,
  endPhoto?: string,
  queryClient?: QueryClient
): Promise<boolean> {
  try {
    // Verify authentication status
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    // Update the shift record
    const { error } = await supabase
      .from('shifts')
      .update({
        end_time: new Date().toISOString(),
        ending_cash: endingCash,
        status: 'closed',
        end_photo: endPhoto
      })
      .eq('id', shiftId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error closing shift:', error);
    // Let the calling function handle the error
    throw error;
  }
}


// Get the active shift for a user in a store
export async function getActiveShift(
  userId: string,
  storeId: string
): Promise<Shift | null> {
  try {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;

    if (data) {
      // Type assertion to ShiftRow
      const shiftData = data as unknown as ShiftRow;
      return mapShiftRowToShift(shiftData);
    }

    return null;
  } catch (error) {
    console.error('Error fetching active shift:', error);
    throw error;
  }
}

// Get the previous shift's ending cash for a store and user
export async function getPreviousShiftEndingCash(
  userId: string,
  storeId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('shifts')
      .select('ending_cash')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .eq('status', 'closed')
      .order('end_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return data?.ending_cash || 0;
  } catch (error) {
    console.error('Error fetching previous shift ending cash:', error);
    return 0;
  }
}

export const createShiftData = (
  userId: string,
  storeId: string,
  startingCash: number,
  photo?: string,
  cashierId?: string
) => {
  return {
    user_id: userId,
    store_id: storeId,
    starting_cash: startingCash,
    start_photo: photo,
    cashier_id: cashierId,
    status: 'active' as const,
    start_time: new Date().toISOString()
  };
};
