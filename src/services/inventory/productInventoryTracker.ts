import { supabase } from "@/integrations/supabase/client";

export interface AffectedInventoryItem {
  item_name: string;
  item_id: string;
  unit: string;
  quantity_deducted: number;
  previous_stock: number;
  new_stock: number;
  deduction_type: 'direct' | 'recipe_ingredient';
}

export interface InventoryDeductionResult {
  success: boolean;
  affected_inventory_items: AffectedInventoryItem[];
  error_details?: string;
}

/**
 * Enhanced ingredient deduction service that tracks affected inventory items
 */
export const deductIngredientsWithTracking = async (
  productId: string,
  quantity: number,
  transactionId: string
): Promise<InventoryDeductionResult> => {
  const affectedItems: AffectedInventoryItem[] = [];
  const syncStartTime = Date.now();

  try {
    console.log('🔄 Starting tracked ingredient deduction for product:', { productId, quantity, transactionId });

    // Get product information
    let productInfo: any = null;
    
    // Try product_catalog first
    const { data: catalogInfo } = await supabase
      .from('product_catalog')
      .select('product_name, recipe_id, store_id')
      .eq('id', productId)
      .maybeSingle();

    if (catalogInfo) {
      productInfo = catalogInfo;
    } else {
      // Try products table
      const { data: directProductInfo } = await supabase
        .from('products')
        .select('name, recipe_id, store_id')
        .eq('id', productId)
        .maybeSingle();
      
      if (directProductInfo) {
        productInfo = { 
          product_name: directProductInfo.name, 
          recipe_id: directProductInfo.recipe_id,
          store_id: directProductInfo.store_id
        };
      }
    }

    if (!productInfo) {
      const errorDetails = `Product not found: ${productId}`;
      
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'failed',
        p_error_details: errorDetails,
        p_items_processed: 0,
        p_sync_duration_ms: Date.now() - syncStartTime,
        p_affected_inventory_items: JSON.stringify([])
      });
      
      return { success: false, affected_inventory_items: [], error_details: errorDetails };
    }

    // Check for direct inventory mapping first
    const { data: directInventoryItem } = await supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity, serving_ready_quantity, unit, store_id')
      .eq('store_id', productInfo.store_id)
      .eq('is_active', true)
      .or(`item.ilike.${productInfo.product_name},item.ilike.%${productInfo.product_name}%`)
      .limit(1)
      .maybeSingle();

    // Handle direct inventory products
    if (directInventoryItem) {
      console.log('🥤 Processing as direct inventory product:', productInfo.product_name);

      const currentStock = directInventoryItem.serving_ready_quantity || directInventoryItem.stock_quantity || 0;
      const newStock = Math.max(0, currentStock - quantity);

      if (currentStock < quantity) {
        const errorDetails = `Insufficient stock for ${productInfo.product_name}: need ${quantity}, have ${currentStock}`;
        
        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: transactionId,
          p_sync_status: 'failed',
          p_error_details: errorDetails,
          p_items_processed: 0,
          p_sync_duration_ms: Date.now() - syncStartTime,
          p_affected_inventory_items: JSON.stringify([])
        });

        return { success: false, affected_inventory_items: [], error_details: errorDetails };
      }

      // Update inventory
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ 
          stock_quantity: newStock,
          serving_ready_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', directInventoryItem.id);

      if (updateError) {
        const errorDetails = `Failed to update direct inventory: ${updateError.message}`;
        
        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: transactionId,
          p_sync_status: 'failed',
          p_error_details: errorDetails,
          p_items_processed: 0,
          p_sync_duration_ms: Date.now() - syncStartTime,
          p_affected_inventory_items: JSON.stringify([])
        });

        return { success: false, affected_inventory_items: [], error_details: errorDetails };
      }

      // Track affected item
      const affectedItem: AffectedInventoryItem = {
        item_name: directInventoryItem.item,
        item_id: directInventoryItem.id,
        unit: directInventoryItem.unit,
        quantity_deducted: quantity,
        previous_stock: currentStock,
        new_stock: newStock,
        deduction_type: 'direct'
      };

      affectedItems.push(affectedItem);

      // Create movement record
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
      
      if (isValidUUID) {
        await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: directInventoryItem.id,
            movement_type: 'sale',
            quantity_change: -quantity,
            previous_quantity: currentStock,
            new_quantity: newStock,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            reference_type: 'transaction',
            reference_id: transactionId,
            notes: `Direct product sale: ${productInfo.product_name}`
          });
      }

      // Log successful sync
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'success',
        p_error_details: null,
        p_items_processed: 1,
        p_sync_duration_ms: Date.now() - syncStartTime,
        p_affected_inventory_items: JSON.stringify(affectedItems)
      });

      console.log(`✅ Successfully deducted direct inventory for "${productInfo.product_name}"`);
      return { success: true, affected_inventory_items: affectedItems };
    }

    // Handle recipe-based products
    console.log('📦 Processing as recipe-based product');

    // Get ingredients from product_ingredients table first
    let { data: ingredients } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    // If no product ingredients found, try recipe ingredients
    if (!ingredients || ingredients.length === 0) {
      if (productInfo.recipe_id) {
        const { data: recipeIngredients } = await supabase
          .from('recipe_ingredients')
          .select(`
            *,
            inventory_item:inventory_stock(*)
          `)
          .eq('recipe_id', productInfo.recipe_id);

        // Map recipe ingredients to product ingredient format
        ingredients = recipeIngredients?.map(ri => ({
          ...ri,
          product_catalog_id: productId,
          required_quantity: ri.quantity,
          inventory_stock_id: ri.inventory_stock_id
        })) || [];
      }
    }

    if (!ingredients || ingredients.length === 0) {
      const errorDetails = `No ingredients configured for product: ${productInfo.product_name}`;
      
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'failed',
        p_error_details: errorDetails,
        p_items_processed: 0,
        p_sync_duration_ms: Date.now() - syncStartTime,
        p_affected_inventory_items: JSON.stringify([])
      });

      return { success: false, affected_inventory_items: [], error_details: errorDetails };
    }

    // Validate stock and prepare updates
    const insufficientStock = [];
    const updates = [];
    
    for (const ingredient of ingredients) {
      const deductionAmount = ingredient.required_quantity * quantity;
      const currentStock = ingredient.inventory_item?.stock_quantity || 0;
      const newStock = currentStock - deductionAmount;

      if (newStock < 0) {
        insufficientStock.push({
          ingredient: ingredient.inventory_item?.item,
          required: deductionAmount,
          available: currentStock
        });
      } else {
        updates.push({
          id: ingredient.inventory_stock_id,
          newStock,
          deductionAmount,
          currentStock,
          item: ingredient.inventory_item?.item,
          unit: ingredient.inventory_item?.unit
        });
      }
    }

    // Check for insufficient stock
    if (insufficientStock.length > 0) {
      const errorDetails = insufficientStock.map(item => 
        `${item.ingredient}: need ${item.required}, have ${item.available}`
      ).join('; ');
      
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'failed',
        p_error_details: `Insufficient stock: ${errorDetails}`,
        p_items_processed: 0,
        p_sync_duration_ms: Date.now() - syncStartTime,
        p_affected_inventory_items: JSON.stringify([])
      });
      
      return { success: false, affected_inventory_items: [], error_details: `Insufficient stock: ${errorDetails}` };
    }

    // Update inventory and track changes
    let processedCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ stock_quantity: update.newStock })
        .eq('id', update.id);
      
      if (updateError) {
        const errorDetails = `Failed to update ${update.item}: ${updateError.message}`;
        
        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: transactionId,
          p_sync_status: 'failed',
          p_error_details: errorDetails,
          p_items_processed: processedCount,
          p_sync_duration_ms: Date.now() - syncStartTime,
          p_affected_inventory_items: JSON.stringify(affectedItems)
        });
        
        return { success: false, affected_inventory_items: affectedItems, error_details: errorDetails };
      }

      // Track affected item
      const affectedItem: AffectedInventoryItem = {
        item_name: update.item,
        item_id: update.id,
        unit: update.unit,
        quantity_deducted: update.deductionAmount,
        previous_stock: update.currentStock,
        new_stock: update.newStock,
        deduction_type: 'recipe_ingredient'
      };

      affectedItems.push(affectedItem);

      // Create movement record
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
      
      if (isValidUUID) {
        await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: update.id,
            movement_type: 'sale',
            quantity_change: -update.deductionAmount,
            previous_quantity: update.currentStock,
            new_quantity: update.newStock,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            reference_type: 'transaction',
            reference_id: transactionId,
            notes: `Recipe ingredient for: ${productInfo.product_name}`
          });
      }
      
      processedCount++;
    }

    // Log successful sync
    await supabase.rpc('log_inventory_sync_result', {
      p_transaction_id: transactionId,
      p_sync_status: 'success',
      p_error_details: null,
      p_items_processed: processedCount,
      p_sync_duration_ms: Date.now() - syncStartTime,
      p_affected_inventory_items: JSON.stringify(affectedItems)
    });

    console.log(`✅ Successfully deducted ingredients for "${productInfo.product_name}"`);
    console.log('📊 Affected inventory items:', affectedItems);
    
    return { success: true, affected_inventory_items: affectedItems };
    
  } catch (error) {
    console.error('❌ Critical ingredient deduction error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    await supabase.rpc('log_inventory_sync_result', {
      p_transaction_id: transactionId,
      p_sync_status: 'failed',
      p_error_details: `Critical error: ${errorMessage}`,
      p_items_processed: 0,
      p_sync_duration_ms: Date.now() - syncStartTime,
      p_affected_inventory_items: JSON.stringify(affectedItems)
    });
    
    return { success: false, affected_inventory_items: affectedItems, error_details: errorMessage };
  }
};

/**
 * Get inventory sync history for a product
 */
export const getProductInventoryHistory = async (productId: string, limit: number = 50) => {
  // This would require additional table linking - for now return basic info
  const { data, error } = await supabase
    .from('inventory_sync_audit')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching product inventory history:', error);
    return [];
  }

  return data;
};