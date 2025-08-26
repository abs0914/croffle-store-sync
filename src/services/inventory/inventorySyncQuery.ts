import { supabase } from "@/integrations/supabase/client";

export interface InventorySyncSummary {
  transaction_id: string;
  sync_status: 'success' | 'failed';
  items_processed: number;
  sync_duration_ms: number;
  affected_inventory_items: any[];
  error_details?: string;
  created_at: string;
}

/**
 * Get inventory sync details for a specific transaction
 */
export const getTransactionInventorySync = async (transactionId: string): Promise<InventorySyncSummary | null> => {
  try {
    const { data, error } = await supabase
      .from('inventory_sync_audit')
      .select('*')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching transaction inventory sync:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      transaction_id: data.transaction_id,
      sync_status: data.sync_status as 'success' | 'failed',
      items_processed: data.items_processed || 0,
      sync_duration_ms: data.sync_duration_ms || 0,
      affected_inventory_items: Array.isArray(data.affected_inventory_items) ? data.affected_inventory_items : [],
      error_details: data.error_details,
      created_at: data.created_at
    };
  } catch (error) {
    console.error('Error in getTransactionInventorySync:', error);
    return null;
  }
};

/**
 * Get recent inventory sync history
 */
export const getRecentInventorySyncs = async (limit: number = 50): Promise<InventorySyncSummary[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_sync_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent inventory syncs:', error);
      return [];
    }

    return data?.map(item => ({
      transaction_id: item.transaction_id,
      sync_status: item.sync_status as 'success' | 'failed',
      items_processed: item.items_processed || 0,
      sync_duration_ms: item.sync_duration_ms || 0,
      affected_inventory_items: Array.isArray(item.affected_inventory_items) ? item.affected_inventory_items : [],
      error_details: item.error_details,
      created_at: item.created_at
    })) || [];
  } catch (error) {
    console.error('Error in getRecentInventorySyncs:', error);
    return [];
  }
};

/**
 * Get inventory sync statistics for a store
 */
export const getInventorySyncStats = async (storeId?: string, hours: number = 24) => {
  try {
    const timeFilter = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    let query = supabase
      .from('inventory_sync_audit')
      .select('sync_status, items_processed, sync_duration_ms, created_at')
      .gte('created_at', timeFilter);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inventory sync stats:', error);
      return null;
    }

    const totalSyncs = data?.length || 0;
    const successfulSyncs = data?.filter(sync => sync.sync_status === 'success').length || 0;
    const failedSyncs = data?.filter(sync => sync.sync_status === 'failed').length || 0;
    const totalItemsProcessed = data?.reduce((sum, sync) => sum + (sync.items_processed || 0), 0) || 0;
    const avgDuration = data?.length > 0 
      ? data.reduce((sum, sync) => sum + (sync.sync_duration_ms || 0), 0) / data.length 
      : 0;

    return {
      total_syncs: totalSyncs,
      successful_syncs: successfulSyncs,
      failed_syncs: failedSyncs,
      success_rate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0,
      total_items_processed: totalItemsProcessed,
      average_duration_ms: Math.round(avgDuration),
      time_period_hours: hours
    };
  } catch (error) {
    console.error('Error in getInventorySyncStats:', error);
    return null;
  }
};

/**
 * Simple report: Product sales → Inventory deductions
 */
export const generateProductInventoryReport = async (limit: number = 100) => {
  try {
    // Get recent syncs with affected items
    const syncs = await getRecentInventorySyncs(limit);
    
    const report = syncs
      .filter(sync => sync.sync_status === 'success' && sync.affected_inventory_items.length > 0)
      .map(sync => ({
        transaction_id: sync.transaction_id,
        sync_date: sync.created_at,
        items_processed: sync.items_processed,
        affected_items: sync.affected_inventory_items.map((item: any) => ({
          item_name: item.item_name,
          quantity_deducted: item.quantity_deducted,
          unit: item.unit,
          deduction_type: item.deduction_type,
          stock_before: item.previous_stock,
          stock_after: item.new_stock
        }))
      }));

    return report;
  } catch (error) {
    console.error('Error generating product inventory report:', error);
    return [];
  }
};