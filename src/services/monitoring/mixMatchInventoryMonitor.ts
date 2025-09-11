/**
 * Mix & Match Inventory Monitoring Service
 * 
 * Phase 3: Enhanced logging, monitoring, and failure detection for Mix & Match products
 */

import { supabase } from '@/integrations/supabase/client';

export interface MixMatchMonitoringResult {
  transactionId: string;
  storeId: string;
  status: 'success' | 'partial_failure' | 'complete_failure';
  mixMatchItems: Array<{
    itemName: string;
    productId?: string;
    baseName: string;
    addons: string[];
    baseIngredientsDeducted: number;
    addonIngredientsDeducted: number;
    totalIngredientsExpected: number;
    deductionSuccessRate: number;
  }>;
  totalMixMatchItems: number;
  successfulDeductions: number;
  failedDeductions: number;
  warnings: string[];
  errors: string[];
  processingTimeMs: number;
  timestamp: string;
}

export interface MixMatchFailureAlert {
  alertId: string;
  storeId: string;
  storeName?: string;
  transactionId: string;
  failedItems: string[];
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedActions: string[];
  timestamp: string;
}

/**
 * Monitor Mix & Match inventory deductions and generate alerts
 */
export class MixMatchInventoryMonitor {
  
  /**
   * Monitor a transaction for Mix & Match inventory deduction success
   */
  static async monitorTransaction(
    transactionId: string,
    storeId: string,
    transactionItems: Array<{
      name: string;
      quantity: number;
      product_id?: string;
    }>
  ): Promise<MixMatchMonitoringResult> {
    const startTime = Date.now();
    
    console.log(`🔍 MONITORING MIX & MATCH TRANSACTION: ${transactionId}`);
    
    const result: MixMatchMonitoringResult = {
      transactionId,
      storeId,
      status: 'success',
      mixMatchItems: [],
      totalMixMatchItems: 0,
      successfulDeductions: 0,
      failedDeductions: 0,
      warnings: [],
      errors: [],
      processingTimeMs: 0,
      timestamp: new Date().toISOString()
    };

    try {
      // Import the Mix & Match processor
      const { EnhancedMixMatchProcessor } = await import('@/services/pos/enhancedMixMatchService');
      
      // Process each transaction item
      for (const item of transactionItems) {
        const isMixMatch = EnhancedMixMatchProcessor.isMixMatchProduct(item.name);
        
        if (isMixMatch) {
          result.totalMixMatchItems++;
          
          console.log(`🎯 Monitoring Mix & Match item: ${item.name}`);
          
          // Parse the Mix & Match product
          const parsedProduct = EnhancedMixMatchProcessor.parseMixMatchName(item.name);
          
          // Check for inventory deductions
          const deductionCheck = await this.checkInventoryDeductions(
            transactionId,
            parsedProduct.baseName,
            parsedProduct.addons.map(a => a.name),
            item.quantity
          );
          
          const mixMatchResult = {
            itemName: item.name,
            productId: item.product_id,
            baseName: parsedProduct.baseName,
            addons: parsedProduct.addons.map(a => a.name),
            baseIngredientsDeducted: deductionCheck.baseIngredientsDeducted,
            addonIngredientsDeducted: deductionCheck.addonIngredientsDeducted,
            totalIngredientsExpected: deductionCheck.totalIngredientsExpected,
            deductionSuccessRate: deductionCheck.successRate
          };
          
          result.mixMatchItems.push(mixMatchResult);
          
          if (deductionCheck.successRate >= 0.8) { // 80% success threshold
            result.successfulDeductions++;
          } else {
            result.failedDeductions++;
            result.warnings.push(`Low deduction success rate for ${item.name}: ${(deductionCheck.successRate * 100).toFixed(1)}%`);
          }
          
          if (deductionCheck.successRate === 0) {
            result.errors.push(`Complete deduction failure for ${item.name}`);
          }
        }
      }
      
      // Determine overall status
      if (result.failedDeductions === 0) {
        result.status = 'success';
      } else if (result.successfulDeductions > 0) {
        result.status = 'partial_failure';
      } else {
        result.status = 'complete_failure';
      }
      
      result.processingTimeMs = Date.now() - startTime;
      
      console.log(`✅ MIX & MATCH MONITORING COMPLETE:`, {
        status: result.status,
        totalMixMatchItems: result.totalMixMatchItems,
        successfulDeductions: result.successfulDeductions,
        failedDeductions: result.failedDeductions
      });
      
      // Generate alerts if needed
      if (result.status !== 'success') {
        await this.generateFailureAlert(result);
      }
      
      // Log monitoring result
      await this.logMonitoringResult(result);
      
    } catch (error) {
      console.error(`❌ Mix & Match monitoring failed:`, error);
      result.errors.push(`Monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.status = 'complete_failure';
      result.processingTimeMs = Date.now() - startTime;
    }
    
    return result;
  }
  
  /**
   * Check if inventory deductions occurred for Mix & Match ingredients
   */
  private static async checkInventoryDeductions(
    transactionId: string,
    baseName: string,
    addons: string[],
    quantity: number
  ): Promise<{
    baseIngredientsDeducted: number;
    addonIngredientsDeducted: number;
    totalIngredientsExpected: number;
    successRate: number;
  }> {
    
    // Check for inventory movements related to this transaction
    const { data: movements } = await supabase
      .from('inventory_movements')
      .select(`
        id,
        inventory_stock_id,
        quantity_change,
        notes,
        inventory_stock (
          item
        )
      `)
      .eq('reference_id', transactionId)
      .eq('reference_type', 'transaction');
    
    if (!movements || movements.length === 0) {
      console.log(`⚠️ No inventory movements found for transaction ${transactionId}`);
      return {
        baseIngredientsDeducted: 0,
        addonIngredientsDeducted: 0,
        totalIngredientsExpected: 1 + addons.length, // Base + addons
        successRate: 0
      };
    }
    
    let baseIngredientsDeducted = 0;
    let addonIngredientsDeducted = 0;
    
    // Count deductions for base ingredients (croissant, whipped cream, etc.)
    const baseIngredientKeywords = ['croissant', 'whipped', 'cream', 'choco flakes'];
    baseIngredientsDeducted = movements.filter(m => 
      m.inventory_stock?.item && 
      baseIngredientKeywords.some(keyword => 
        m.inventory_stock!.item.toLowerCase().includes(keyword)
      )
    ).length;
    
    // Count deductions for addon ingredients
    for (const addon of addons) {
      const addonFound = movements.some(m => 
        m.inventory_stock?.item && 
        m.inventory_stock.item.toLowerCase().includes(addon.toLowerCase())
      );
      if (addonFound) {
        addonIngredientsDeducted++;
      }
    }
    
    const totalIngredientsExpected = Math.max(1, baseIngredientKeywords.length) + addons.length;
    const totalDeducted = baseIngredientsDeducted + addonIngredientsDeducted;
    const successRate = totalIngredientsExpected > 0 ? totalDeducted / totalIngredientsExpected : 0;
    
    console.log(`📊 Deduction check for ${baseName}:`, {
      baseIngredientsDeducted,
      addonIngredientsDeducted,
      totalIngredientsExpected,
      successRate: (successRate * 100).toFixed(1) + '%'
    });
    
    return {
      baseIngredientsDeducted,
      addonIngredientsDeducted,
      totalIngredientsExpected,
      successRate
    };
  }
  
  /**
   * Generate failure alert for Mix & Match deduction issues
   */
  private static async generateFailureAlert(result: MixMatchMonitoringResult): Promise<void> {
    const failedItems = result.mixMatchItems
      .filter(item => item.deductionSuccessRate < 0.8)
      .map(item => item.itemName);
    
    if (failedItems.length === 0) return;
    
    // Determine impact level
    let impactLevel: MixMatchFailureAlert['impactLevel'] = 'low';
    if (result.status === 'complete_failure') {
      impactLevel = 'critical';
    } else if (result.failedDeductions > result.successfulDeductions) {
      impactLevel = 'high';
    } else if (result.failedDeductions > 0) {
      impactLevel = 'medium';
    }
    
    // Get store name
    const { data: store } = await supabase
      .from('stores')
      .select('name')
      .eq('id', result.storeId)
      .single();
    
    const alert: MixMatchFailureAlert = {
      alertId: `mixmatch-${result.transactionId}-${Date.now()}`,
      storeId: result.storeId,
      storeName: store?.name || 'Unknown Store',
      transactionId: result.transactionId,
      failedItems,
      impactLevel,
      description: `Mix & Match inventory deduction ${result.status} for ${failedItems.length} items`,
      suggestedActions: this.generateSuggestedActions(result),
      timestamp: result.timestamp
    };
    
    console.log(`🚨 GENERATING MIX & MATCH ALERT:`, alert);
    
    // Log alert to console (database logging can be added later with proper schema)
    console.warn(`🚨 MIX & MATCH ALERT GENERATED:`, JSON.stringify(alert, null, 2));
  }
  
  /**
   * Generate suggested actions based on monitoring results
   */
  private static generateSuggestedActions(result: MixMatchMonitoringResult): string[] {
    const actions: string[] = [];
    
    if (result.status === 'complete_failure') {
      actions.push('Check if Mix & Match recipe templates exist and are properly linked');
      actions.push('Verify inventory stock items are mapped to recipe ingredients');
      actions.push('Review product catalog entries for Mix & Match products');
    }
    
    if (result.errors.some(e => e.includes('No base recipe found'))) {
      actions.push('Create or link base recipe templates for Mix & Match products');
    }
    
    if (result.warnings.some(w => w.includes('No inventory mapping'))) {
      actions.push('Update inventory mappings for Mix & Match ingredients');
    }
    
    if (result.failedDeductions > 0) {
      actions.push('Manually review and correct inventory levels for affected items');
      actions.push('Consider running inventory reconciliation for this store');
    }
    
    actions.push('Monitor subsequent Mix & Match transactions for improvement');
    
    return actions;
  }
  
  /**
   * Log monitoring result to console (database logging can be added later)
   */
  private static async logMonitoringResult(result: MixMatchMonitoringResult): Promise<void> {
    console.log(`📊 MIX & MATCH MONITORING RESULT:`, JSON.stringify({
      transactionId: result.transactionId,
      storeId: result.storeId,
      status: result.status,
      totalMixMatchItems: result.totalMixMatchItems,
      successfulDeductions: result.successfulDeductions,
      failedDeductions: result.failedDeductions,
      processingTimeMs: result.processingTimeMs,
      mixMatchItems: result.mixMatchItems,
      warnings: result.warnings,
      errors: result.errors
    }, null, 2));
  }
  
  /**
   * Get recent Mix & Match performance metrics (placeholder implementation)
   */
  static async getPerformanceMetrics(
    storeId: string,
    hours: number = 24
  ): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    partialFailures: number;
    completeFailures: number;
    averageSuccessRate: number;
    commonFailureReasons: string[];
  }> {
    
    // Placeholder implementation - would use dedicated monitoring table in production
    console.log(`📊 Getting Mix & Match performance metrics for store ${storeId} (last ${hours} hours)`);
    
    return {
      totalTransactions: 0,
      successfulTransactions: 0,
      partialFailures: 0,
      completeFailures: 0,
      averageSuccessRate: 0,
      commonFailureReasons: []
    };
  }
}