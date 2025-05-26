

import { supabase } from "@/integrations/supabase/client";

// Debug function to check user permissions for inventory operations
export const debugInventoryPermissions = async (storeId: string): Promise<void> => {
  try {
    console.log('=== Debugging Inventory Permissions ===');
    
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      return;
    }
    
    if (!session) {
      console.error('No active session');
      return;
    }
    
    console.log('Current user:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    });
    
    // Check app_users record
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    if (appUserError) {
      console.error('Error fetching app_users record:', appUserError);
    } else {
      console.log('App user record:', appUser);
      console.log('Store access:', {
        storeId,
        hasAccess: appUser?.store_ids?.includes(storeId) || appUser?.role === 'admin' || appUser?.role === 'owner'
      });
    }
    
    // Test inventory_stock read access
    const { data: inventoryItems, error: readError } = await supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity')
      .eq('store_id', storeId)
      .limit(1);
    
    if (readError) {
      console.error('Inventory read error:', readError);
    } else {
      console.log('Inventory read test successful, items found:', inventoryItems?.length || 0);
    }
    
    // Test inventory_stock update access (dry run)
    if (inventoryItems && inventoryItems.length > 0) {
      const testItem = inventoryItems[0];
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', testItem.id)
        .eq('store_id', storeId);
      
      if (updateError) {
        console.error('Inventory update test error:', updateError);
      } else {
        console.log('Inventory update test successful');
      }
    }
    
    // Test inventory_transactions insert access
    if (inventoryItems && inventoryItems.length > 0) {
      const testItem = inventoryItems[0];
      const { data: transactionData, error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert({
          product_id: testItem.id,
          store_id: storeId,
          transaction_type: 'debug_test',
          quantity: 0,
          previous_quantity: testItem.stock_quantity,
          new_quantity: testItem.stock_quantity,
          created_by: session.user.id,
          notes: 'Debug permission test - should be deleted'
        })
        .select()
        .single();
      
      if (transactionError) {
        console.error('Transaction insert test error:', transactionError);
      } else {
        console.log('Transaction insert test successful');
        
        // Clean up test transaction
        if (transactionData?.id) {
          await supabase
            .from('inventory_transactions')
            .delete()
            .eq('id', transactionData.id);
        }
      }
    }
    
    console.log('=== End Inventory Permissions Debug ===');
  } catch (error) {
    console.error('Debug function error:', error);
  }
};

// Function to check if current user has inventory access for a store
export const checkInventoryAccess = async (storeId: string): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    
    // Check if user is admin/owner or has store access
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role, store_ids')
      .eq('user_id', session.user.id)
      .single();
    
    if (!appUser) return false;
    
    return (
      appUser.role === 'admin' || 
      appUser.role === 'owner' || 
      appUser.store_ids?.includes(storeId) ||
      session.user.email === 'admin@example.com'
    );
  } catch (error) {
    console.error('Error checking inventory access:', error);
    return false;
  }
};

// Enhanced inventory update function with better error handling
export const updateInventoryStockWithRetry = async (
  itemId: string,
  storeId: string,
  newQuantity: number,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: any }> => {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`Attempting to update inventory stock for item ${itemId}:`, {
        newQuantity,
        storeId,
        attempt: retryCount + 1
      });

      // First, let's verify the item exists and we can read it
      const { data: existingItem, error: readError } = await supabase
        .from('inventory_stock')
        .select('id, item, stock_quantity, store_id')
        .eq('id', itemId)
        .eq('store_id', storeId)
        .single();

      if (readError) {
        console.error('Error reading inventory item before update:', readError);
        return { success: false, error: readError };
      }

      if (!existingItem) {
        console.error('Inventory item not found:', { itemId, storeId });
        return { success: false, error: new Error('Inventory item not found') };
      }

      console.log('Current inventory item before update:', existingItem);

      // Now attempt the update
      const { data: updatedData, error: updateError } = await supabase
        .from('inventory_stock')
        .update({
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('store_id', storeId)
        .select();

      if (updateError) {
        console.error('Inventory update error:', {
          error: updateError,
          itemId,
          storeId,
          newQuantity,
          attempt: retryCount + 1
        });

        // Handle specific error types
        if (updateError.code === '409' || updateError.message?.includes('conflict')) {
          console.warn(`Conflict detected for item ${itemId}, retry ${retryCount + 1}/${maxRetries}`);
          retryCount++;
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)));
          continue;
        } else {
          // Non-retryable error
          return { success: false, error: updateError };
        }
      }

      console.log('Inventory update successful:', {
        itemId,
        newQuantity,
        updatedData
      });

      // Verify the update was successful by reading the item again
      const { data: verifyData, error: verifyError } = await supabase
        .from('inventory_stock')
        .select('stock_quantity')
        .eq('id', itemId)
        .single();

      if (verifyError) {
        console.warn('Could not verify update:', verifyError);
      } else {
        console.log('Verified updated quantity:', {
          expected: newQuantity,
          actual: verifyData.stock_quantity,
          matches: verifyData.stock_quantity === newQuantity
        });
      }

      return { success: true };
    } catch (exception) {
      console.error('Exception during inventory update:', exception);
      return { success: false, error: exception };
    }
  }
  
  return { success: false, error: new Error(`Failed after ${maxRetries} retries`) };
};
