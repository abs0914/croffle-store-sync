
import { supabase } from "@/integrations/supabase/client";
import { StockTransaction } from "@/types/inventoryManagement";
import { toast } from "sonner";

export const fetchStockTransactions = async (
  storeId: string,
  filters?: {
    itemId?: string;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<StockTransaction[]> => {
  try {
    let query = supabase
      .from('stock_transactions')
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .eq('inventory_item_id', storeId) // This will be corrected to filter by store through inventory_items
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.itemId) {
      query = query.eq('inventory_item_id', filters.itemId);
    }
    
    if (filters?.transactionType) {
      query = query.eq('transaction_type', filters.transactionType);
    }
    
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching stock transactions:', error);
    toast.error('Failed to fetch stock transactions');
    return [];
  }
};

export const createStockTransaction = async (
  transaction: Omit<StockTransaction, 'id' | 'created_at'>
): Promise<StockTransaction | null> => {
  try {
    const { data, error } = await supabase
      .from('stock_transactions')
      .insert(transaction)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating stock transaction:', error);
    toast.error('Failed to create stock transaction');
    return null;
  }
};

export const getTransactionSummary = async (
  storeId: string,
  period: 'day' | 'week' | 'month' = 'month'
): Promise<{
  totalTransactions: number;
  adjustments: number;
  transfers: number;
  stockOuts: number;
}> => {
  try {
    const startDate = new Date();
    if (period === 'day') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const { data, error } = await supabase
      .from('stock_transactions')
      .select('transaction_type')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const summary = {
      totalTransactions: data?.length || 0,
      adjustments: data?.filter(t => t.transaction_type === 'adjustment').length || 0,
      transfers: data?.filter(t => t.transaction_type.includes('transfer')).length || 0,
      stockOuts: data?.filter(t => t.transaction_type === 'stock_out').length || 0,
    };

    return summary;
  } catch (error) {
    console.error('Error getting transaction summary:', error);
    return {
      totalTransactions: 0,
      adjustments: 0,
      transfers: 0,
      stockOuts: 0,
    };
  }
};
