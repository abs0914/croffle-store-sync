/**
 * Inventory Deduction Success Rate Monitor
 * Tracks the effectiveness of the Mix & Match base ingredient fix
 */

import { supabase } from '@/integrations/supabase/client';

export interface InventoryDeductionMetrics {
  totalTransactions: number;
  successfulDeductions: number;
  mixMatchTransactions: number;
  mixMatchSuccessful: number;
  successRate: number;
  mixMatchSuccessRate: number;
  baseIngredientDeductions: number;
  addonDeductions: number;
}

/**
 * Monitor inventory deduction success rates
 */
export class InventoryDeductionMonitor {
  /**
   * Get comprehensive metrics for a store over a time period
   */
  static async getMetrics(
    storeId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<InventoryDeductionMetrics> {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = endDate || new Date();

    // Get all transactions in period
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, created_at, receipt_number')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (txError || !transactions) {
      console.error('Error fetching transactions for metrics:', txError);
      return this.getEmptyMetrics();
    }

    // Get inventory movements for these transactions
    const transactionIds = transactions.map(t => t.id);
    if (transactionIds.length === 0) {
      return this.getEmptyMetrics();
    }

    const { data: movements, error: movError } = await supabase
      .from('inventory_transactions')
      .select(`
        reference_id, 
        quantity,
        inventory_stock:inventory_stock(item)
      `)
      .in('reference_id', transactionIds)
      .eq('transaction_type', 'sale');

    if (movError) {
      console.error('Error fetching inventory movements:', movError);
      return this.getEmptyMetrics();
    }

    // Analyze Mix & Match transactions (approximate detection by checking transaction items)
    const { data: transactionItems, error: tiError } = await supabase
      .from('transaction_items')
      .select('transaction_id, name')
      .in('transaction_id', transactionIds);

    if (tiError) {
      console.error('Error fetching transaction items:', tiError);
    }

    // Calculate metrics
    const totalTransactions = transactions.length;
    const transactionsWithDeductions = new Set(movements?.map(m => m.reference_id) || []);
    const successfulDeductions = transactionsWithDeductions.size;

    // Detect Mix & Match transactions (items with "with" in name)
    const mixMatchTransactionIds = new Set<string>();
    transactionItems?.forEach(item => {
      if (item.name.includes(' with ')) {
        mixMatchTransactionIds.add(item.transaction_id);
      }
    });

    const mixMatchTransactions = mixMatchTransactionIds.size;
    const mixMatchWithDeductions = Array.from(mixMatchTransactionIds)
      .filter(id => transactionsWithDeductions.has(id)).length;

    // Count base ingredient vs addon deductions
    const baseIngredientItems = ['Regular Croissant', 'Mini Croissant', 'Cup', 'Spoon', 'Paper Wrapper'];
    const baseIngredientDeductions = movements?.filter(m => 
      baseIngredientItems.some(base => (m as any).inventory_stock?.item?.includes(base))
    ).length || 0;

    const addonDeductions = (movements?.length || 0) - baseIngredientDeductions;

    return {
      totalTransactions,
      successfulDeductions,
      mixMatchTransactions,
      mixMatchSuccessful: mixMatchWithDeductions,
      successRate: totalTransactions > 0 ? (successfulDeductions / totalTransactions) * 100 : 0,
      mixMatchSuccessRate: mixMatchTransactions > 0 ? (mixMatchWithDeductions / mixMatchTransactions) * 100 : 0,
      baseIngredientDeductions,
      addonDeductions
    };
  }

  /**
   * Log success rate improvement
   */
  static async logSuccessRateImprovement(
    storeId: string,
    beforeMetrics: InventoryDeductionMetrics,
    afterMetrics: InventoryDeductionMetrics
  ): Promise<void> {
    const improvement = {
      store_id: storeId,
      before_success_rate: beforeMetrics.successRate,
      after_success_rate: afterMetrics.successRate,
      improvement_percentage: afterMetrics.successRate - beforeMetrics.successRate,
      mix_match_before: beforeMetrics.mixMatchSuccessRate,
      mix_match_after: afterMetrics.mixMatchSuccessRate,
      base_ingredient_deductions_added: afterMetrics.baseIngredientDeductions - beforeMetrics.baseIngredientDeductions,
      recorded_at: new Date().toISOString()
    };

    console.log('🎯 Inventory Deduction Success Rate Improvement:', improvement);
    
    // Could store in audit table if needed
    // await supabase.from('inventory_deduction_improvements').insert(improvement);
  }

  private static getEmptyMetrics(): InventoryDeductionMetrics {
    return {
      totalTransactions: 0,
      successfulDeductions: 0,
      mixMatchTransactions: 0,
      mixMatchSuccessful: 0,
      successRate: 0,
      mixMatchSuccessRate: 0,
      baseIngredientDeductions: 0,
      addonDeductions: 0
    };
  }

  /**
   * Check if base ingredient deduction is working for recent transactions
   */
  static async validateBaseIngredientDeduction(storeId: string): Promise<{
    isWorking: boolean;
    recentBaseDeductions: number;
    recentMixMatchTransactions: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    // Check last hour for recent Mix & Match transactions
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', oneHourAgo.toISOString());

    if (!recentTransactions || recentTransactions.length === 0) {
      return {
        isWorking: true, // No recent transactions to check
        recentBaseDeductions: 0,
        recentMixMatchTransactions: 0,
        issues: ['No recent transactions to validate']
      };
    }

    // Check for Mix & Match items in recent transactions
    const { data: recentItems } = await supabase
      .from('transaction_items')
      .select('transaction_id, name')
      .in('transaction_id', recentTransactions.map(t => t.id));

    const mixMatchTransactionIds = new Set<string>();
    recentItems?.forEach(item => {
      if (item.name.includes(' with ')) {
        mixMatchTransactionIds.add(item.transaction_id);
      }
    });

    // Check for base ingredient deductions
    const { data: baseDeductions } = await supabase
      .from('inventory_transactions')
      .select(`
        reference_id,
        inventory_stock:inventory_stock(item)
      `)
      .in('reference_id', Array.from(mixMatchTransactionIds))
      .eq('transaction_type', 'sale');

    const recentBaseDeductions = baseDeductions?.filter(bd => {
      const item = (bd as any).inventory_stock?.item || '';
      return item.includes('Croissant') || item.includes('Cup') || item.includes('Spoon');
    }).length || 0;
    const recentMixMatchTransactions = mixMatchTransactionIds.size;

    // Validation logic
    const isWorking = recentMixMatchTransactions === 0 || recentBaseDeductions > 0;
    
    if (recentMixMatchTransactions > 0 && recentBaseDeductions === 0) {
      issues.push('Mix & Match transactions found but no base ingredient deductions detected');
    }

    return {
      isWorking,
      recentBaseDeductions,
      recentMixMatchTransactions,
      issues
    };
  }
}