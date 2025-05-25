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
      const { error: transactionError } = await supabase
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
        if (transactionError?.id) {
          await supabase
            .from('inventory_transactions')
            .delete()
            .eq('id', transactionError.id);
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
      const { error } = await supabase
        .from('inventory_stock')
        .update({
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('store_id', storeId);
      
      if (!error) {
        return { success: true };
      }
      
      // Handle specific error types
      if (error.code === '409' || error.message?.includes('conflict')) {
        console.warn(`Conflict detected for item ${itemId}, retry ${retryCount + 1}/${maxRetries}`);
        retryCount++;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)));
        continue;
      } else {
        // Non-retryable error
        return { success: false, error };
      }
    } catch (exception) {
      return { success: false, error: exception };
    }
  }
  
  return { success: false, error: new Error(`Failed after ${maxRetries} retries`) };
};
