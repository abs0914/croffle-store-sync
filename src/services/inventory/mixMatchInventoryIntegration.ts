/**
 * Mix & Match Inventory Integration Service
 * 
 * Phase 2: Integration layer that replaces the standard batch service 
 * with Mix & Match enhanced processing for transactions
 */

import { enhancedBatchDeductInventoryForTransaction } from './enhancedBatchInventoryService';
import { MixMatchInventoryMonitor } from '@/services/monitoring/mixMatchInventoryMonitor';
import type { BatchInventoryDeductionResult, BatchTransactionItem } from './batchInventoryService';

/**
 * Primary integration point for Mix & Match inventory processing
 * 
 * This function should be called instead of the original batchDeductInventoryForTransaction
 * for all transactions to ensure Mix & Match products are handled correctly
 */
export const processTransactionInventoryWithMixMatchSupport = async (
  transactionId: string,
  storeId: string,
  transactionItems: Array<{
    product_id?: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>,
  timeoutMs: number = 30000
): Promise<BatchInventoryDeductionResult> => {
  
  console.log(`🎯 STARTING MIX & MATCH ENHANCED INVENTORY PROCESSING`);
  console.log(`   Transaction: ${transactionId}`);
  console.log(`   Store: ${storeId}`);
  console.log(`   Items: ${transactionItems.length}`);
  
  try {
    // Step 1: Process inventory deduction with enhanced Mix & Match support
    const deductionResult = await enhancedBatchDeductInventoryForTransaction(
      transactionId,
      storeId,
      transactionItems,
      timeoutMs
    );
    
    console.log(`✅ Enhanced inventory deduction completed:`, {
      success: deductionResult.success,
      itemsProcessed: deductionResult.itemsProcessed,
      deductedItems: deductionResult.deductedItems.length,
      errors: deductionResult.errors.length,
      warnings: deductionResult.warnings.length
    });
    
    // Step 2: Monitor Mix & Match performance (non-blocking)
    MixMatchInventoryMonitor.monitorTransaction(
      transactionId,
      storeId,
      transactionItems
    ).catch(error => {
      console.warn(`⚠️ Mix & Match monitoring failed (non-critical):`, error);
    });
    
    // Step 3: Enhanced logging for Mix & Match transactions
    const mixMatchItems = transactionItems.filter(item => 
      item.name.toLowerCase().includes('mini croffle') ||
      item.name.toLowerCase().includes('croffle overload') ||
      item.name.toLowerCase().includes('with ')
    );
    
    if (mixMatchItems.length > 0) {
      console.log(`🎯 MIX & MATCH TRANSACTION PROCESSED:`, {
        transactionId,
        storeId,
        mixMatchItemsCount: mixMatchItems.length,
        mixMatchItems: mixMatchItems.map(item => item.name),
        overallSuccess: deductionResult.success,
        deductionTime: deductionResult.processingTimeMs
      });
      
      // Log specific Mix & Match results
      if (!deductionResult.success) {
        console.error(`❌ MIX & MATCH INVENTORY DEDUCTION FAILED:`, {
          transactionId,
          errors: deductionResult.errors,
          warnings: deductionResult.warnings,
          mixMatchItems: mixMatchItems.map(item => item.name)
        });
      }
    }
    
    return deductionResult;
    
  } catch (error) {
    console.error(`❌ Mix & Match inventory processing failed:`, error);
    
    return {
      success: false,
      deductedItems: [],
      errors: [`Mix & Match processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      processingTimeMs: 0,
      itemsProcessed: 0
    };
  }
};

/**
 * Manual correction function for failed Mix & Match inventory deductions
 * 
 * This can be used to manually correct inventory when Mix & Match deductions fail
 */
export const manuallyCorrectMixMatchInventory = async (
  transactionId: string,
  storeId: string,
  corrections: Array<{
    itemName: string;
    inventoryStockId: string;
    quantityToDeduct: number;
    notes?: string;
  }>
): Promise<{
  success: boolean;
  correctedItems: string[];
  errors: string[];
}> => {
  
  console.log(`🔧 MANUAL MIX & MATCH INVENTORY CORRECTION:`, {
    transactionId,
    storeId,
    correctionsCount: corrections.length
  });
  
  const result = {
    success: true,
    correctedItems: [] as string[],
    errors: [] as string[]
  };
  
  const { supabase } = await import('@/integrations/supabase/client');
  
  for (const correction of corrections) {
    try {
      // Get current inventory
      const { data: inventory, error: fetchError } = await supabase
        .from('inventory_stock')
        .select('id, item, stock_quantity')
        .eq('id', correction.inventoryStockId)
        .eq('store_id', storeId)
        .single();
      
      if (fetchError || !inventory) {
        result.errors.push(`Failed to fetch inventory for ${correction.itemName}: ${fetchError?.message || 'Not found'}`);
        continue;
      }
      
      const currentStock = inventory.stock_quantity || 0;
      const newStock = Math.max(0, currentStock - correction.quantityToDeduct);
      
      // Update inventory
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', correction.inventoryStockId);
      
      if (updateError) {
        result.errors.push(`Failed to update ${correction.itemName}: ${updateError.message}`);
        continue;
      }
      
      // Log the manual correction
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('inventory_movements')
        .insert({
          inventory_stock_id: correction.inventoryStockId,
          movement_type: 'sale',
          quantity_change: -correction.quantityToDeduct,
          previous_quantity: currentStock,
          new_quantity: newStock,
          reference_type: 'manual_correction',
          reference_id: transactionId,
          notes: `Manual Mix & Match correction: ${correction.notes || 'No notes'}`,
          created_by: user?.id || null
        });
      
      result.correctedItems.push(correction.itemName);
      
      console.log(`✅ Manually corrected ${correction.itemName}: ${currentStock} → ${newStock}`);
      
    } catch (error) {
      console.error(`❌ Manual correction failed for ${correction.itemName}:`, error);
      result.errors.push(`Manual correction failed for ${correction.itemName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  result.success = result.errors.length === 0;
  
  console.log(`🔧 Manual correction completed:`, {
    success: result.success,
    correctedItems: result.correctedItems.length,
    errors: result.errors.length
  });
  
  return result;
};

/**
 * Get Mix & Match inventory deduction status for a transaction
 */
export const getMixMatchDeductionStatus = async (
  transactionId: string,
  storeId: string
): Promise<{
  transactionFound: boolean;
  mixMatchItems: Array<{
    itemName: string;
    expectedIngredients: number;
    actualDeductions: number;
    deductionRate: number;
    status: 'success' | 'partial' | 'failed';
  }>;
  overallStatus: 'success' | 'partial' | 'failed';
  recommendations: string[];
}> => {
  
  console.log(`📊 Checking Mix & Match deduction status for transaction ${transactionId}`);
  
  const { supabase } = await import('@/integrations/supabase/client');
  
  // Get transaction items
    const { data: transaction } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_items (
          name,
          quantity
        )
      `)
      .eq('id', transactionId)
      .single();
  
  if (!transaction) {
    return {
      transactionFound: false,
      mixMatchItems: [],
      overallStatus: 'failed',
      recommendations: ['Transaction not found']
    };
  }
  
  // Check inventory movements for this transaction
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select(`
      inventory_stock_id,
      quantity_change,
      inventory_stock (
        item
      )
    `)
    .eq('reference_id', transactionId)
    .eq('reference_type', 'transaction');
  
  const { EnhancedMixMatchProcessor } = await import('@/services/pos/enhancedMixMatchService');
  
  const mixMatchItems = [];
  let successCount = 0;
  let partialCount = 0;
  let failedCount = 0;
  
  for (const transactionItem of transaction.transaction_items || []) {
    const isMixMatch = EnhancedMixMatchProcessor.isMixMatchProduct(transactionItem.name);
    
    if (isMixMatch) {
      const parsed = EnhancedMixMatchProcessor.parseMixMatchName(transactionItem.name);
      const expectedIngredients = Math.max(2, 1 + parsed.addons.length); // Base + addons
      
      // Count actual deductions for this item's ingredients
      const relatedDeductions = movements?.filter(m => {
        const itemName = m.inventory_stock?.item?.toLowerCase() || '';
        const baseName = parsed.baseName.toLowerCase();
        const addonNames = parsed.addons.map(a => a.name.toLowerCase());
        
        return itemName.includes(baseName) || 
               addonNames.some(addon => itemName.includes(addon)) ||
               itemName.includes('croissant') || 
               itemName.includes('whipped');
      }) || [];
      
      const actualDeductions = relatedDeductions.length;
      const deductionRate = expectedIngredients > 0 ? actualDeductions / expectedIngredients : 0;
      
      let status: 'success' | 'partial' | 'failed';
      if (deductionRate >= 0.8) {
        status = 'success';
        successCount++;
      } else if (deductionRate > 0) {
        status = 'partial';
        partialCount++;
      } else {
        status = 'failed';
        failedCount++;
      }
      
      mixMatchItems.push({
        itemName: transactionItem.name,
        expectedIngredients,
        actualDeductions,
        deductionRate,
        status
      });
    }
  }
  
  let overallStatus: 'success' | 'partial' | 'failed';
  if (failedCount === 0 && partialCount === 0) {
    overallStatus = 'success';
  } else if (successCount > 0) {
    overallStatus = 'partial';
  } else {
    overallStatus = 'failed';
  }
  
  const recommendations = [];
  if (overallStatus === 'failed') {
    recommendations.push('All Mix & Match deductions failed - check recipe templates and inventory mappings');
  } else if (overallStatus === 'partial') {
    recommendations.push('Some Mix & Match deductions failed - review ingredient mappings');
  }
  
  if (mixMatchItems.some(item => item.deductionRate === 0)) {
    recommendations.push('Consider manual inventory correction for failed items');
  }
  
  return {
    transactionFound: true,
    mixMatchItems,
    overallStatus,
    recommendations
  };
};