/**
 * Unified Inventory Audit Service
 * 
 * This service standardizes the usage of inventory_movements and inventory_transactions
 * to ensure consistent audit trails throughout the application.
 * 
 * USAGE PATTERNS:
 * - inventory_movements: Primary audit table for raw inventory changes (stock adjustments, transfers, etc.)
 * - inventory_transactions: Product-specific operations (sales, returns via product catalog)
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MovementType = 'sale' | 'return' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'restock' | 'damage' | 'expire' | 'recipe_usage' | 'conversion';

export type TransactionType = 'sale' | 'return' | 'adjustment' | 'transfer' | 'recipe_usage' | 'conversion' | 'restock';

export interface InventoryMovementData {
  inventory_stock_id: string;
  movement_type: MovementType;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reference_type?: 'transaction' | 'purchase_order' | 'grn' | 'manual' | 'transfer' | 'recipe';
  reference_id?: string;
  notes?: string;
  created_by?: string;
}

export interface InventoryTransactionData {
  store_id: string;
  product_id: string;
  variation_id?: string;
  transaction_type: TransactionType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id?: string;
  notes?: string;
  created_by?: string;
}

/**
 * PRIMARY: Log inventory movements (raw inventory changes)
 * Use this for direct inventory stock changes, transfers, adjustments
 */
export const logInventoryMovement = async (data: InventoryMovementData): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    // Get current user if not provided
    let createdBy = data.created_by;
    if (!createdBy) {
      const { data: { user } } = await supabase.auth.getUser();
      createdBy = user?.id || 'system';
    }

    const { data: result, error } = await supabase
      .from('inventory_movements')
      .insert({
        inventory_stock_id: data.inventory_stock_id,
        movement_type: data.movement_type,
        quantity_change: data.quantity_change,
        previous_quantity: data.previous_quantity,
        new_quantity: data.new_quantity,
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        notes: data.notes,
        created_by: createdBy,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log inventory movement:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Logged inventory movement: ${data.movement_type} - ${data.quantity_change} for ${data.inventory_stock_id}`);
    return { success: true, id: result.id };

  } catch (error) {
    console.error('Exception in logInventoryMovement:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * SECONDARY: Log product transactions (product-specific operations)
 * Use this for product catalog-based transactions (POS sales, returns)
 */
export const logInventoryTransaction = async (data: InventoryTransactionData): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    // Get current user if not provided
    let createdBy = data.created_by;
    if (!createdBy) {
      const { data: { user } } = await supabase.auth.getUser();
      createdBy = user?.id || 'system';
    }

    // Validate reference_id format if provided
    let validatedReferenceId: string | null = null;
    if (data.reference_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(data.reference_id)) {
        validatedReferenceId = data.reference_id;
      } else {
        console.warn(`Invalid reference_id UUID format: ${data.reference_id}`);
        validatedReferenceId = data.reference_id; // Allow non-UUID references
      }
    }

    const { data: result, error } = await supabase
      .from('inventory_transactions')
      .insert({
        store_id: data.store_id,
        product_id: data.product_id,
        variation_id: data.variation_id,
        transaction_type: data.transaction_type,
        quantity: data.quantity,
        previous_quantity: data.previous_quantity,
        new_quantity: data.new_quantity,
        reference_id: validatedReferenceId,
        notes: data.notes,
        created_by: createdBy,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log inventory transaction:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Logged inventory transaction: ${data.transaction_type} - ${data.quantity} for product ${data.product_id}`);
    return { success: true, id: result.id };

  } catch (error) {
    console.error('Exception in logInventoryTransaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * UNIFIED: Update inventory stock with proper audit trail
 * This function handles the stock update and creates appropriate audit records
 */
export const updateInventoryStockWithAudit = async (
  inventoryStockId: string,
  newQuantity: number,
  movementType: MovementType,
  options: {
    storeId?: string;
    productId?: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
    useServingReady?: boolean;
  } = {}
): Promise<{ success: boolean; error?: string; movementId?: string; transactionId?: string }> => {
  
  try {
    console.log(`🔄 Updating inventory stock ${inventoryStockId} to ${newQuantity} (${movementType})`);

    // Get current inventory state
    const { data: currentStock, error: fetchError } = await supabase
      .from('inventory_stock')
      .select('stock_quantity, serving_ready_quantity, store_id, item')
      .eq('id', inventoryStockId)
      .single();

    if (fetchError || !currentStock) {
      return { success: false, error: `Failed to fetch current stock: ${fetchError?.message}` };
    }

    // Determine which field to update
    const useServingReady = options.useServingReady ?? (currentStock.serving_ready_quantity !== null);
    const currentQuantity = useServingReady 
      ? (currentStock.serving_ready_quantity || 0)
      : (currentStock.stock_quantity || 0);
    
    const quantityChange = newQuantity - currentQuantity;
    const updateField = useServingReady ? 'serving_ready_quantity' : 'stock_quantity';

    // Update the inventory stock
    const { error: updateError } = await supabase
      .from('inventory_stock')
      .update({
        [updateField]: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryStockId);

    if (updateError) {
      return { success: false, error: `Failed to update inventory: ${updateError.message}` };
    }

    console.log(`✅ Updated ${updateField}: ${currentQuantity} → ${newQuantity} (change: ${quantityChange})`);

    // Create audit trail - ALWAYS use inventory_movements as primary
    const movementResult = await logInventoryMovement({
      inventory_stock_id: inventoryStockId,
      movement_type: movementType,
      quantity_change: quantityChange,
      previous_quantity: currentQuantity,
      new_quantity: newQuantity,
      reference_type: options.referenceType as any,
      reference_id: options.referenceId,
      notes: options.notes || `${movementType} - ${currentStock.item}`,
      created_by: options.createdBy
    });

    if (!movementResult.success) {
      console.warn('⚠️ Failed to log movement but inventory was updated:', movementResult.error);
    }

    // Create product transaction record ONLY if this is product-related
    let transactionResult = null;
    if (options.storeId && options.productId && ['sale', 'return'].includes(movementType)) {
      transactionResult = await logInventoryTransaction({
        store_id: options.storeId,
        product_id: options.productId,
        transaction_type: movementType as TransactionType,
        quantity: Math.abs(quantityChange),
        previous_quantity: currentQuantity,
        new_quantity: newQuantity,
        reference_id: options.referenceId,
        notes: options.notes,
        created_by: options.createdBy
      });

      if (!transactionResult.success) {
        console.warn('⚠️ Failed to log product transaction but inventory was updated:', transactionResult.error);
      }
    }

    return { 
      success: true, 
      movementId: movementResult.id,
      transactionId: transactionResult?.id
    };

  } catch (error) {
    console.error('❌ Exception in updateInventoryStockWithAudit:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * BATCH: Update multiple inventory items with unified audit trail
 */
export const batchUpdateInventoryWithAudit = async (
  updates: Array<{
    inventoryStockId: string;
    newQuantity: number;
    movementType: MovementType;
    options?: {
      storeId?: string;
      productId?: string;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
      createdBy?: string;
      useServingReady?: boolean;
    };
  }>,
  transactionId?: string
): Promise<{ success: boolean; results: Array<{ success: boolean; error?: string; inventoryStockId: string }> }> => {
  
  console.log(`🔄 Batch updating ${updates.length} inventory items`);
  
  const results = [];
  let overallSuccess = true;

  for (const update of updates) {
    const result = await updateInventoryStockWithAudit(
      update.inventoryStockId,
      update.newQuantity,
      update.movementType,
      {
        ...(update.options || {}),
        referenceId: update.options?.referenceId || transactionId
      }
    );

    results.push({
      success: result.success,
      error: result.error,
      inventoryStockId: update.inventoryStockId
    });

    if (!result.success) {
      overallSuccess = false;
    }
  }

  console.log(`✅ Batch update completed: ${results.filter(r => r.success).length}/${results.length} successful`);

  return { success: overallSuccess, results };
};

/**
 * QUERY: Get audit trail for an inventory item
 */
export const getInventoryAuditTrail = async (
  inventoryStockId: string,
  options: {
    startDate?: string;
    endDate?: string;
    movementTypes?: MovementType[];
    limit?: number;
  } = {}
): Promise<{
  movements: Array<any>;
  transactions: Array<any>;
}> => {
  
  try {
    // Get inventory movements (primary audit trail)
    let movementQuery = supabase
      .from('inventory_movements')
      .select(`
        *,
        inventory_stock:inventory_stock(item, unit)
      `)
      .eq('inventory_stock_id', inventoryStockId)
      .order('created_at', { ascending: false });

    if (options.startDate) {
      movementQuery = movementQuery.gte('created_at', options.startDate);
    }
    if (options.endDate) {
      movementQuery = movementQuery.lte('created_at', options.endDate);
    }
    if (options.movementTypes && options.movementTypes.length > 0) {
      movementQuery = movementQuery.in('movement_type', options.movementTypes);
    }
    if (options.limit) {
      movementQuery = movementQuery.limit(options.limit);
    }

    // Get inventory transactions (secondary audit trail)
    let transactionQuery = supabase
      .from('inventory_transactions')
      .select('*')
      .eq('product_id', inventoryStockId)
      .order('created_at', { ascending: false });

    if (options.startDate) {
      transactionQuery = transactionQuery.gte('created_at', options.startDate);
    }
    if (options.endDate) {
      transactionQuery = transactionQuery.lte('created_at', options.endDate);
    }
    if (options.limit) {
      transactionQuery = transactionQuery.limit(options.limit);
    }

    const [movementResult, transactionResult] = await Promise.all([
      movementQuery,
      transactionQuery
    ]);

    return {
      movements: movementResult.data || [],
      transactions: transactionResult.data || []
    };

  } catch (error) {
    console.error('Failed to fetch audit trail:', error);
    return { movements: [], transactions: [] };
  }
};

/**
 * RECONCILIATION: Verify audit trail integrity
 */
export const verifyAuditTrailIntegrity = async (
  inventoryStockId: string
): Promise<{
  isValid: boolean;
  issues: string[];
  currentStock: number;
  calculatedStock: number;
}> => {
  
  try {
    // Get current stock
    const { data: currentStock } = await supabase
      .from('inventory_stock')
      .select('stock_quantity, serving_ready_quantity, item')
      .eq('id', inventoryStockId)
      .single();

    if (!currentStock) {
      return {
        isValid: false,
        issues: ['Inventory item not found'],
        currentStock: 0,
        calculatedStock: 0
      };
    }

    // Get all movements in chronological order
    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('quantity_change, previous_quantity, new_quantity, created_at, movement_type')
      .eq('inventory_stock_id', inventoryStockId)
      .order('created_at', { ascending: true });

    const issues: string[] = [];
    const actualStock = currentStock.serving_ready_quantity ?? currentStock.stock_quantity ?? 0;
    
    if (!movements || movements.length === 0) {
      return {
        isValid: true,
        issues: ['No movements found - cannot verify'],
        currentStock: actualStock,
        calculatedStock: actualStock
      };
    }

    // Verify movement chain integrity
    let calculatedStock = movements[0].previous_quantity;
    
    for (const movement of movements) {
      const expectedNew = calculatedStock + movement.quantity_change;
      
      if (Math.abs(expectedNew - movement.new_quantity) > 0.001) {
        issues.push(`Movement inconsistency at ${movement.created_at}: expected ${expectedNew}, recorded ${movement.new_quantity}`);
      }
      
      calculatedStock = movement.new_quantity;
    }

    // Compare with current stock
    if (Math.abs(calculatedStock - actualStock) > 0.001) {
      issues.push(`Final stock mismatch: calculated ${calculatedStock}, actual ${actualStock}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      currentStock: actualStock,
      calculatedStock
    };

  } catch (error) {
    console.error('Failed to verify audit trail:', error);
    return {
      isValid: false,
      issues: [`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      currentStock: 0,
      calculatedStock: 0
    };
  }
};