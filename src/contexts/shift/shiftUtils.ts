import { supabase } from "@/integrations/supabase/client";
import { ShiftType } from "@/types";
import { ShiftRow } from "./types";
import { toast } from "sonner";

// Map from ShiftRow to Shift model
export function mapShiftRowToShift(shiftData: ShiftRow): ShiftType {
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
    cashierId: shiftData.cashier_id || undefined
  };
}

// Create a new shift
export async function createShift(
  userId: string,
  storeId: string,
  startingCash: number,
  startInventoryCount: Record<string, number>,
  startPhoto?: string,
  cashierId?: string
): Promise<ShiftType | null> {
  try {
    // Verify authentication status
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    console.log("Creating shift with params:", {
      userId, storeId, startingCash, cashierId,
      inventoryCount: Object.keys(startInventoryCount).length + " items"
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
      start_inventory_count: startInventoryCount,
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
  endInventoryCount: Record<string, number>,
  endPhoto?: string
): Promise<boolean> {
  try {
    // Verify authentication status
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    // Get the current shift data to access store_id and start_inventory_count
    const { data: shiftData, error: shiftError } = await supabase
      .from('shifts')
      .select('store_id, start_inventory_count, user_id')
      .eq('id', shiftId)
      .single();

    if (shiftError) throw shiftError;

    // Update the shift record
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

    // Synchronize inventory counts with the actual inventory system
    await synchronizeInventoryFromShift(
      shiftData.store_id,
      shiftData.start_inventory_count || {},
      endInventoryCount,
      shiftId,
      session.user.id
    );

    return true;
  } catch (error) {
    console.error('Error closing shift:', error);
    // Let the calling function handle the error
    throw error;
  }
}

// Synchronize inventory counts from shift closure with actual inventory system
async function synchronizeInventoryFromShift(
  storeId: string,
  startInventoryCount: Record<string, number>,
  endInventoryCount: Record<string, number>,
  shiftId: string,
  userId: string
): Promise<void> {
  try {
    console.log('Synchronizing inventory from shift closure:', {
      storeId,
      shiftId,
      itemCount: Object.keys(endInventoryCount).length
    });

    // Get all inventory stock items for this store
    const { data: inventoryItems, error: fetchError } = await supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity')
      .eq('store_id', storeId);

    if (fetchError) {
      console.error('Error fetching inventory items:', fetchError);
      throw fetchError;
    }

    // Create a map for quick lookup by item name
    const inventoryMap = new Map<string, { id: string; currentStock: number }>();
    inventoryItems?.forEach(item => {
      inventoryMap.set(item.item, { id: item.id, currentStock: item.stock_quantity });
    });

    // Process each item in the end inventory count
    for (const [itemName, endCount] of Object.entries(endInventoryCount)) {
      const inventoryItem = inventoryMap.get(itemName);

      if (!inventoryItem) {
        console.warn(`Inventory item "${itemName}" not found in inventory_stock table`);
        continue;
      }

      const startCount = startInventoryCount[itemName] || 0;
      const currentStock = inventoryItem.currentStock;

      // Calculate the difference between start and end counts
      const countDifference = endCount - startCount;

      // Calculate expected stock based on shift inventory tracking
      // If end count is less than start count, it means items were consumed/sold
      // If end count is more than start count, it means items were added/restocked
      const expectedStock = currentStock + countDifference;

      // Only update if there's a significant difference (avoid minor discrepancies)
      const stockDifference = Math.abs(expectedStock - currentStock);
      if (stockDifference >= 0.01) { // Allow for small rounding differences

        console.log(`Updating inventory for "${itemName}":`, {
          startCount,
          endCount,
          currentStock,
          expectedStock,
          difference: countDifference
        });

        // Update the inventory stock quantity
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({
            stock_quantity: expectedStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventoryItem.id);

        if (updateError) {
          console.error(`Error updating inventory for "${itemName}":`, updateError);
          continue; // Continue with other items even if one fails
        }

        // Create an inventory transaction record for audit trail
        const { error: transactionError } = await supabase
          .from('inventory_transactions')
          .insert({
            product_id: inventoryItem.id,
            store_id: storeId,
            transaction_type: 'shift_reconciliation',
            quantity: Math.abs(countDifference),
            previous_quantity: currentStock,
            new_quantity: expectedStock,
            reference_id: shiftId,
            created_by: userId,
            notes: `Shift closure reconciliation: ${startCount} → ${endCount} (${countDifference >= 0 ? '+' : ''}${countDifference})`
          });

        if (transactionError) {
          console.error(`Error creating transaction record for "${itemName}":`, transactionError);
          // Don't throw here, just log the error
        }
      }
    }

    console.log('Inventory synchronization completed successfully');
  } catch (error) {
    console.error('Error synchronizing inventory from shift:', error);
    // Don't throw the error to prevent shift closure from failing
    // The shift should still close even if inventory sync fails
  }
}

// Get the active shift for a user in a store
export async function getActiveShift(
  userId: string,
  storeId: string
): Promise<ShiftType | null> {
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
