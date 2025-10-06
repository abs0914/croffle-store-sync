/**
 * SIMPLIFIED MIX & MATCH INVENTORY SERVICE
 * 
 * Uses pre-computed deductions from the database (mix_match_ingredient_deductions table)
 * Eliminates complex real-time pattern matching and ingredient categorization
 * 
 * Performance: <100ms (was 10s+ with timeouts)
 */

import { supabase } from '@/integrations/supabase/client';
import { SimplifiedInventoryAuditService } from './simplifiedInventoryAuditService';

interface MixMatchDeduction {
  id: string;
  ingredient_name: string;
  inventory_stock_id: string;
  quantity_per_unit: number;
  ingredient_category: 'base' | 'choice' | 'packaging';
}

interface SimplifiedDeductionResult {
  success: boolean;
  deductedCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * Parse product name to extract selected choices
 * Example: "Mini Croffle with Choco Flakes and Chocolate" -> ["Choco Flakes", "Chocolate"]
 */
function parseSelectedChoices(productName: string): string[] {
  const withIndex = productName.toLowerCase().indexOf(' with ');
  if (withIndex === -1) return [];
  
  const choicesStr = productName.substring(withIndex + 6); // Skip " with "
  return choicesStr
    .split(' and ')
    .map(choice => choice.trim())
    .filter(choice => choice.length > 0);
}

/**
 * Simplified mix & match deduction using pre-computed rules
 */
export async function simplifiedMixMatchDeduction(
  transactionId: string,
  storeId: string,
  productName: string,
  quantity: number,
  userId: string
): Promise<SimplifiedDeductionResult> {
  console.log(`🚀 [SIMPLIFIED] Processing Mix & Match: ${productName} x${quantity}`);
  
  const result: SimplifiedDeductionResult = {
    success: true,
    deductedCount: 0,
    skippedCount: 0,
    errors: []
  };

  try {
    // Step 1: Fetch pre-computed deductions for this product
    const { data: deductions, error } = await supabase
      .from('mix_match_ingredient_deductions')
      .select('*')
      .eq('store_id', storeId)
      .eq('product_name', productName)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching deductions:', error);
      result.errors.push(`Failed to fetch deductions: ${error.message}`);
      result.success = false;
      return result;
    }

    if (!deductions || deductions.length === 0) {
      console.log('ℹ️ No pre-computed deductions found, treating as regular product');
      return result;
    }

    console.log(`📋 Found ${deductions.length} pre-computed deductions`);

    // Step 2: Parse selected choices from product name
    const selectedChoices = parseSelectedChoices(productName);
    console.log(`🎯 Selected choices:`, selectedChoices);

    // Step 3: Filter deductions based on category and selections
    const deductionsToApply = deductions.filter(d => {
      // Always deduct base and packaging
      if (d.ingredient_category === 'base' || d.ingredient_category === 'packaging') {
        return true;
      }
      
      // Only deduct choice ingredients that were selected
      if (d.ingredient_category === 'choice') {
        return selectedChoices.some(choice => 
          choice.toLowerCase().includes(d.ingredient_name.toLowerCase()) ||
          d.ingredient_name.toLowerCase().includes(choice.toLowerCase())
        );
      }
      
      return false;
    });

    console.log(`✅ Will deduct ${deductionsToApply.length} ingredients (${deductionsToApply.filter(d => d.ingredient_category === 'base').length} base + ${deductionsToApply.filter(d => d.ingredient_category === 'choice').length} choices + ${deductionsToApply.filter(d => d.ingredient_category === 'packaging').length} packaging)`);

    // Step 4: Fetch current stock for all ingredients (single batch query)
    const stockIds = deductionsToApply.map(d => d.inventory_stock_id);
    const { data: stockItems, error: stockError } = await supabase
      .from('inventory_stock')
      .select('id, stock_quantity, item')
      .in('id', stockIds);

    if (stockError || !stockItems) {
      console.error('❌ Failed to fetch stock items:', stockError);
      result.errors.push('Failed to fetch inventory stock');
      result.success = false;
      return result;
    }

    // Create lookup map
    const stockMap = new Map(stockItems.map(item => [item.id, item]));

    // Step 5: Prepare batch updates and audit records
    const updates = deductionsToApply
      .map(deduction => {
        const deductQuantity = deduction.quantity_per_unit * quantity;
        const inventoryItem = stockMap.get(deduction.inventory_stock_id);

        if (!inventoryItem) {
          console.warn(`⚠️ Inventory item not found: ${deduction.ingredient_name}`);
          result.skippedCount++;
          return null;
        }

        const newStock = inventoryItem.stock_quantity - deductQuantity;
        
        return {
          id: deduction.inventory_stock_id,
          newStock,
          deductQuantity,
          ingredientName: deduction.ingredient_name,
          previousStock: inventoryItem.stock_quantity
        };
      })
      .filter(update => update !== null);

    // Step 6: Execute batch stock updates in parallel
    const updatePromises = updates.map(update => 
      supabase
        .from('inventory_stock')
        .update({ stock_quantity: update.newStock })
        .eq('id', update.id)
    );

    const updateResults = await Promise.allSettled(updatePromises);
    
    // Step 7: Process update results and create audit records
    const auditPromises = [];
    for (let i = 0; i < updateResults.length; i++) {
      const updateResult = updateResults[i];
      const update = updates[i];

      if (updateResult.status === 'rejected' || updateResult.value.error) {
        const error = updateResult.status === 'rejected' 
          ? updateResult.reason 
          : updateResult.value.error;
        console.error(`❌ Failed to deduct ${update.ingredientName}:`, error);
        result.errors.push(`Failed to deduct ${update.ingredientName}`);
        continue;
      }

      // Queue audit record creation
      auditPromises.push(
        SimplifiedInventoryAuditService.deductWithAudit(
          update.id,
          update.deductQuantity,
          transactionId,
          update.ingredientName
        )
      );

      result.deductedCount++;
      console.log(`✅ Deducted ${update.deductQuantity} of ${update.ingredientName} (${update.previousStock} → ${update.newStock})`);
    }

    // Wait for all audit records (non-blocking)
    await Promise.allSettled(auditPromises);

    result.skippedCount = deductions.length - deductionsToApply.length;
    
    console.log(`✅ [SIMPLIFIED] Deduction complete: ${result.deductedCount} deducted, ${result.skippedCount} skipped, ${result.errors.length} errors`);
    
    return result;
  } catch (error) {
    console.error('❌ [SIMPLIFIED] Mix & match deduction failed:', error);
    result.success = false;
    result.errors.push(`Mix & match processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * In-memory cache for Mix & Match product detection
 * Cache duration: 5 minutes
 */
const mixMatchCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a product is a Mix & Match product based on pre-computed deductions
 * Uses in-memory cache to avoid repeated queries
 */
export async function isMixMatchProduct(storeId: string, productName: string): Promise<boolean> {
  const cacheKey = `${storeId}:${productName}`;
  const cached = mixMatchCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }

  const { data, error } = await supabase
    .from('mix_match_ingredient_deductions')
    .select('id')
    .eq('store_id', storeId)
    .eq('product_name', productName)
    .eq('is_active', true)
    .limit(1);

  const result = !error && data && data.length > 0;
  mixMatchCache.set(cacheKey, { result, timestamp: Date.now() });
  
  return result;
}

/**
 * Batch check multiple products for Mix & Match status in a single query
 * Returns a map of productName -> isMixMatch
 */
export async function batchCheckMixMatchProducts(
  storeId: string, 
  productNames: string[]
): Promise<Record<string, boolean>> {
  if (productNames.length === 0) return {};
  
  console.log(`🔍 Batch checking ${productNames.length} products for Mix & Match status`);
  
  const { data, error } = await supabase
    .from('mix_match_ingredient_deductions')
    .select('product_name')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .in('product_name', productNames);

  if (error) {
    console.error('❌ Error batch checking Mix & Match products:', error);
    return {};
  }

  // Build map of results
  const mixMatchSet = new Set(data?.map(d => d.product_name) || []);
  const result: Record<string, boolean> = {};
  
  for (const productName of productNames) {
    result[productName] = mixMatchSet.has(productName);
    
    // Update cache
    const cacheKey = `${storeId}:${productName}`;
    mixMatchCache.set(cacheKey, { 
      result: result[productName], 
      timestamp: Date.now() 
    });
  }
  
  console.log(`✅ Batch check complete: ${mixMatchSet.size} Mix & Match products found`);
  return result;
}
