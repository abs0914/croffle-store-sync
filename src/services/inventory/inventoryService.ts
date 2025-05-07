
import { supabase } from "@/integrations/supabase/client";

// Update inventory
interface UpdateInventoryParams {
  productId: string;
  storeId: string;
  variationId?: string;
  quantity: number;
  reason?: string;
  reference?: string;
  isInitialSet?: boolean;
}

export async function updateInventory({
  productId,
  storeId,
  variationId,
  quantity,
  reason = 'Manual adjustment',
  reference = '',
  isInitialSet = false,
}: UpdateInventoryParams) {
  try {
    // Check current quantity first
    const { data: currentInventory, error: fetchError } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .eq('store_id', storeId)
      .eq('variation_id', variationId || null)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let quantityChange: number;
    
    if (isInitialSet) {
      // Set to absolute value
      if (currentInventory) {
        quantityChange = quantity - currentInventory.quantity;
      } else {
        quantityChange = quantity;
      }
    } else {
      // Use the provided quantity as a change amount
      quantityChange = quantity;
    }
    
    // If there's no change, exit early
    if (quantityChange === 0) return;
    
    // Use the update_inventory function
    const { data, error } = await supabase.rpc(
      'update_inventory',
      {
        p_product_id: productId,
        p_variation_id: variationId || null,
        p_store_id: storeId,
        p_quantity_change: quantityChange,
        p_reason: reason,
        p_reference: reference
      }
    );
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw error;
  }
}

// Fetch inventory history
export async function fetchInventoryTransactions(
  storeId: string, 
  productId?: string,
  limit = 50,
  offset = 0,
) {
  try {
    let query = supabase
      .from('inventory_transactions')
      .select(`
        *,
        products:product_id (name),
        product_variations:variation_id (name)
      `)
      .eq('store_id', storeId);
      
    if (productId) {
      query = query.eq('product_id', productId);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    throw error;
  }
}
