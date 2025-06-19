import { supabase } from "@/integrations/supabase/client";
import { ShiftType } from "@/types";
import { ShiftRow } from "./types";
import { toast } from "sonner";
import { debugInventoryPermissions, checkInventoryAccess, updateInventoryStockWithRetry } from "@/services/inventoryStock/inventoryStockDebug";
import { QueryClient } from "@tanstack/react-query";

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
  endPhoto?: string,
  queryClient?: QueryClient
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

    // Convert the Json type to Record<string, number> safely
    const startInventoryCount = convertJsonToInventoryCount(shiftData.start_inventory_count);

    // Synchronize inventory counts with the actual inventory system
    await synchronizeInventoryFromShift(
      shiftData.store_id,
      startInventoryCount,
      endInventoryCount,
      shiftId,
      session.user.id,
      queryClient
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
  userId: string,
  queryClient?: QueryClient
): Promise<void> {
  try {
    console.log('Synchronizing inventory from shift closure:', {
      storeId,
      shiftId,
      itemCount: Object.keys(endInventoryCount).length,
      userId
    });

    // Verify user authentication and permissions
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session for inventory synchronization');
      return;
    }

    // Check if user has inventory access for this store
    const hasAccess = await checkInventoryAccess(storeId);
    if (!hasAccess) {
      console.warn('User does not have inventory access for store:', storeId);
      // Run debug to understand why
      await debugInventoryPermissions(storeId);
      return;
    }

    // Get all inventory stock items for this store
    const { data: inventoryItems, error: fetchError } = await supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity, store_id')
      .eq('store_id', storeId);

    if (fetchError) {
      console.error('Error fetching inventory items:', fetchError);
      // If it's a permission error, log it but don't fail the shift closure
      if (fetchError.code === 'PGRST301' || fetchError.message?.includes('permission')) {
        console.warn('Permission denied for inventory access - running debug');
        await debugInventoryPermissions(storeId);
        return;
      }
      throw fetchError;
    }

    // Create a map for quick lookup by item ID
    const inventoryMap = new Map<string, { item: string; currentStock: number }>();
    inventoryItems?.forEach(item => {
      inventoryMap.set(item.id, { item: item.item, currentStock: item.stock_quantity });
    });

    // Process each item in the end inventory count
    for (const [itemId, endCount] of Object.entries(endInventoryCount)) {
      const inventoryItem = inventoryMap.get(itemId);

      if (!inventoryItem) {
        console.warn(`Inventory item with ID "${itemId}" not found in inventory_stock table`);
        continue;
      }

      const startCount = startInventoryCount[itemId] || 0;

      // The end count from the shift represents the actual physical count
      // Update the inventory stock to match this count directly
      const newStockQuantity = endCount;
      const currentStock = inventoryItem.currentStock;

      // Only update if there's a difference
      if (Math.abs(newStockQuantity - currentStock) >= 0.01) {
        console.log(`🔄 INVENTORY UPDATE REQUIRED for "${inventoryItem.item}" (ID: ${itemId}):`, {
          startCount: `${startCount} (shift start)`,
          endCount: `${endCount} (shift end)`,
          currentStock: `${currentStock} (database current)`,
          newStockQuantity: `${newStockQuantity} (will update to)`,
          difference: `${newStockQuantity - currentStock} (change)`,
          changeType: newStockQuantity > currentStock ? 'INCREASE' : 'DECREASE'
        });

        // Update the inventory stock quantity with enhanced retry logic
        const updateResult = await updateInventoryStockWithRetry(itemId, storeId, newStockQuantity);

        if (!updateResult.success) {
          console.error(`Failed to update inventory for "${inventoryItem.item}" (ID: ${itemId}):`, updateResult.error);

          // If it's a permission error, run debug
          if (updateResult.error?.code === 'PGRST301' || updateResult.error?.message?.includes('permission')) {
            console.warn('Permission error detected - running debug');
            await debugInventoryPermissions(storeId);
          }

          continue; // Continue with other items even if one fails
        }

        console.log(`Successfully updated inventory for "${inventoryItem.item}"`);

        // Create an inventory transaction record for audit trail (only if update was successful)
        try {
          const { error: transactionError } = await supabase
            .from('inventory_transactions')
            .insert({
              product_id: itemId,
              store_id: storeId,
              transaction_type: 'adjustment', // Use 'adjustment' instead of 'shift_reconciliation'
              quantity: Math.abs(newStockQuantity - currentStock),
              previous_quantity: currentStock,
              new_quantity: newStockQuantity,
              reference_id: shiftId,
              created_by: userId,
              notes: `Shift closure reconciliation for "${inventoryItem.item}": ${startCount} → ${endCount} (${newStockQuantity >= currentStock ? '+' : ''}${newStockQuantity - currentStock})`
            });

          if (transactionError) {
            console.error(`Error creating transaction record for "${inventoryItem.item}" (ID: ${itemId}):`, transactionError);
            // Don't throw here, just log the error - the inventory update was successful
          } else {
            console.log(`Created transaction record for "${inventoryItem.item}"`);
          }
        } catch (transactionCreateError) {
          console.error(`Exception creating transaction record for "${inventoryItem.item}":`, transactionCreateError);
          // Continue - the inventory update was successful even if transaction logging failed
        }
      } else {
        console.log(`✅ NO UPDATE NEEDED for "${inventoryItem.item}" (ID: ${itemId}):`, {
          startCount,
          endCount,
          currentStock,
          reason: 'No significant difference between current stock and end count'
        });
      }
    }

    console.log('Inventory synchronization completed successfully');

    // Invalidate React Query cache to refresh inventory displays
    if (queryClient) {
      console.log('Invalidating inventory cache for store:', storeId);
      await queryClient.invalidateQueries({
        queryKey: ['inventory-stock', storeId]
      });
      console.log('Inventory cache invalidated successfully');
    } else {
      console.warn('QueryClient not provided - inventory cache will not be invalidated');
    }
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

export const createShiftData = (
  userId: string,
  storeId: string,
  startingCash: number,
  startInventoryCount: Record<string, number>,
  photo?: string,
  cashierId?: string
) => {
  return {
    user_id: userId,
    store_id: storeId,
    starting_cash: startingCash,
    start_inventory_count: startInventoryCount,
    start_photo: photo,
    cashier_id: cashierId,
    status: 'active' as const,
    start_time: new Date().toISOString()
  };
};
