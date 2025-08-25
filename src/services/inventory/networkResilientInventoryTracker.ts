import { supabase } from "@/integrations/supabase/client";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";

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
 * Network-aware Supabase client wrapper with retry logic
 */
class NetworkResilientSupabaseClient {
  private static async makeSupabaseCall<T>(
    operation: () => Promise<PostgrestSingleResponse<T>>, 
    operationName: string, 
    retries = 3
  ): Promise<PostgrestSingleResponse<T>> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const result = await Promise.race([operation(), timeoutPromise]);
        return result;
      } catch (error) {
        const isNetworkError = error instanceof TypeError && error.message.includes('Failed to fetch') ||
                              error instanceof Error && (
                                error.message.includes('timeout') ||
                                error.message.includes('network') ||
                                error.message.includes('fetch')
                              );
        
        if (isNetworkError && attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(`⚠️ Network error in ${operationName}, retry ${attempt}/${retries} in ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        console.error(`❌ ${operationName} failed after ${attempt} attempts:`, error);
        throw error;
      }
    }
    throw new Error(`Failed after ${retries} attempts`);
  }

  static async getProductCatalog(productId: string) {
    return this.makeSupabaseCall(
      () => supabase
        .from('product_catalog')
        .select('product_name, recipe_id, store_id')
        .eq('id', productId)
        .maybeSingle(),
      'fetch product catalog'
    );
  }

  static async getProduct(productId: string) {
    return this.makeSupabaseCall(
      () => supabase
        .from('products')
        .select('name, recipe_id, store_id')
        .eq('id', productId)
        .maybeSingle(),
      'fetch product info'
    );
  }

  static async getDirectInventoryItem(productName: string, storeId: string) {
    return this.makeSupabaseCall(
      () => supabase
        .from('inventory_stock')
        .select('id, item, stock_quantity, serving_ready_quantity, unit, store_id')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .or(`item.ilike.${productName},item.ilike.%${productName}%`)
        .limit(1)
        .maybeSingle(),
      'fetch direct inventory item'
    );
  }

  static async logSyncResult(params: {
    transactionId: string;
    status: string;
    errorDetails?: string;
    itemsProcessed: number;
    duration: number;
    affectedItems: AffectedInventoryItem[];
  }) {
    try {
      await this.makeSupabaseCall(
        () => supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: params.transactionId,
          p_sync_status: params.status,
          p_error_details: params.errorDetails || null,
          p_items_processed: params.itemsProcessed,
          p_sync_duration_ms: params.duration,
          p_affected_inventory_items: JSON.stringify(params.affectedItems)
        }),
        'log sync result'
      );
    } catch (logError) {
      console.warn('Failed to log sync result:', logError);
    }
  }
}

/**
 * Enhanced inventory deduction with network resilience and comprehensive error handling
 */
export const deductIngredientsWithNetworkResilience = async (
  productId: string,
  quantity: number,
  transactionId: string
): Promise<InventoryDeductionResult> => {
  const affectedItems: AffectedInventoryItem[] = [];
  const syncStartTime = Date.now();

  try {
    console.log('🔄 Starting network-resilient inventory deduction:', { productId, quantity, transactionId });

    // Get product information with network resilience
    let productInfo: any = null;
    
    // Try product_catalog first
    const catalogResult = await NetworkResilientSupabaseClient.getProductCatalog(productId);
    
    if (catalogResult.data) {
      productInfo = catalogResult.data;
    } else {
      // Try products table
      const directProductResult = await NetworkResilientSupabaseClient.getProduct(productId);
      
      if (directProductResult.data) {
        productInfo = { 
          product_name: directProductResult.data.name, 
          recipe_id: directProductResult.data.recipe_id,
          store_id: directProductResult.data.store_id
        };
      }
    }

    if (!productInfo) {
      const errorDetails = `Product not found: ${productId}`;
      
      await NetworkResilientSupabaseClient.logSyncResult({
        transactionId,
        status: 'failed',
        errorDetails,
        itemsProcessed: 0,
        duration: Date.now() - syncStartTime,
        affectedItems: []
      });
      
      return { success: false, affected_inventory_items: [], error_details: errorDetails };
    }

    // Check for direct inventory mapping first
    const directInventoryResult = await NetworkResilientSupabaseClient.getDirectInventoryItem(
      productInfo.product_name,
      productInfo.store_id
    );
    
    const directInventoryItem = directInventoryResult.data;

    // Handle direct inventory products
    if (directInventoryItem) {
      console.log('🥤 Processing as direct inventory product:', productInfo.product_name);

      const currentStock = directInventoryItem.serving_ready_quantity || directInventoryItem.stock_quantity || 0;
      const newStock = Math.max(0, currentStock - quantity);

      if (currentStock < quantity) {
        const errorDetails = `Insufficient stock for ${productInfo.product_name}: need ${quantity}, have ${currentStock}`;
        
        await NetworkResilientSupabaseClient.logSyncResult({
          transactionId,
          status: 'failed',
          errorDetails,
          itemsProcessed: 0,
          duration: Date.now() - syncStartTime,
          affectedItems: []
        });

        return { success: false, affected_inventory_items: [], error_details: errorDetails };
      }

      // Update inventory with retry logic
      try {
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: newStock,
            serving_ready_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', directInventoryItem.id);

        if (updateError) throw updateError;
      } catch (updateError: any) {
        const errorDetails = `Failed to update direct inventory: ${updateError.message}`;
        
        await NetworkResilientSupabaseClient.logSyncResult({
          transactionId,
          status: 'failed',
          errorDetails,
          itemsProcessed: 0,
          duration: Date.now() - syncStartTime,
          affectedItems: []
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

      // Create movement record if valid UUID
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
      
      if (isValidUUID) {
        try {
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
        } catch (movementError) {
          console.warn('Failed to create movement record:', movementError);
        }
      }

      // Log successful sync
      await NetworkResilientSupabaseClient.logSyncResult({
        transactionId,
        status: 'success',
        itemsProcessed: 1,
        duration: Date.now() - syncStartTime,
        affectedItems
      });

      console.log(`✅ Successfully deducted direct inventory for "${productInfo.product_name}"`);
      return { success: true, affected_inventory_items: affectedItems };
    }

    // For recipe-based products, return a simplified success for now
    // (The full recipe ingredient processing would follow a similar pattern)
    console.log('📦 Recipe-based product processing not yet implemented in network-resilient version');
    
    await NetworkResilientSupabaseClient.logSyncResult({
      transactionId,
      status: 'failed',
      errorDetails: 'Recipe-based products not yet supported in network-resilient mode',
      itemsProcessed: 0,
      duration: Date.now() - syncStartTime,
      affectedItems: []
    });

    return { 
      success: false, 
      affected_inventory_items: [], 
      error_details: 'Recipe-based products not yet supported in network-resilient mode' 
    };
    
  } catch (error) {
    console.error('❌ Critical inventory deduction error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await NetworkResilientSupabaseClient.logSyncResult({
      transactionId,
      status: 'failed',
      errorDetails: `Critical error: ${errorMessage}`,
      itemsProcessed: 0,
      duration: Date.now() - syncStartTime,
      affectedItems
    });
    
    return { success: false, affected_inventory_items: affectedItems, error_details: errorMessage };
  }
};