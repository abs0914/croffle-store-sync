
import { supabase } from "@/integrations/supabase/client";
import { Shift } from "@/types";
import { ShiftRow } from "./types";
import { toast } from "sonner";

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
    endInventoryCount: shiftData.end_inventory_count || undefined
  };
}

// Create a new shift
export async function createShift(
  userId: string,
  storeId: string,
  startingCash: number,
  startInventoryCount: Record<string, number>,
  startPhoto?: string
): Promise<Shift | null> {
  try {
    const newShift = {
      user_id: userId,
      store_id: storeId,
      start_time: new Date().toISOString(),
      starting_cash: startingCash,
      status: 'active',
      start_photo: startPhoto,
      start_inventory_count: startInventoryCount
    };
    
    const { data, error } = await supabase
      .from('shifts')
      .insert(newShift)
      .select()
      .single();
    
    if (error) throw error;
    
    // Type assertion to ShiftRow
    const shiftData = data as unknown as ShiftRow;
    return mapShiftRowToShift(shiftData);
  } catch (error) {
    console.error('Error creating shift:', error);
    toast.error('Failed to create shift');
    return null;
  }
}

// End an active shift
export async function closeShift(
  shiftId: string,
  endingCash: number,
  endInventoryCount: Record<string, number>,
  endPhoto?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shifts')
      .update({
        end_time: new Date().toISOString(),
        ending_cash: endingCash,
        status: 'closed',
        end_photo: endPhoto,
        end_inventory_count: endInventoryCount
      })
      .eq('id', shiftId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error closing shift:', error);
    toast.error('Failed to close shift');
    return false;
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
    toast.error('Failed to fetch active shift');
    return null;
  }
}
