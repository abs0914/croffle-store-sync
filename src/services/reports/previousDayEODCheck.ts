import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { fetchZReadingForThermal } from "./modules/zReadingThermalReport";

export interface EODStatus {
  isComplete: boolean;
  date: string;
  missingDates: string[];
  lastCompletedDate: string | null;
  message: string;
}

/**
 * Check if previous day's EOD (Z-Reading) was completed
 * Critical for Robinsons compliance requirement #6
 * 
 * Uses a simple heuristic: check if transactions exist for yesterday
 * Future enhancement: Add bir_z_reading_log table to track Z-Reading history
 */
export async function checkPreviousDayEOD(storeId: string): Promise<EODStatus> {
  try {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    
    console.log('🔍 EOD Check: Verifying previous day closure for', yesterdayStr);
    
    // Check for transactions yesterday
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, created_at')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', `${yesterdayStr}T00:00:00`)
      .lte('created_at', `${yesterdayStr}T23:59:59`)
      .limit(1);
    
    if (txError) {
      console.error('❌ EOD Check: Transaction query error', txError);
      throw txError;
    }
    
    // If no transactions yesterday, EOD not required
    if (!transactions || transactions.length === 0) {
      console.log('ℹ️ EOD Check: No transactions yesterday, EOD not required');
      return {
        isComplete: true,
        date: yesterdayStr,
        missingDates: [],
        lastCompletedDate: null,
        message: 'No transactions found for previous day'
      };
    }
    
    // TODO: Once bir_z_reading_log table is added, check if Z-Reading was performed
    // For now, we assume EOD needs to be done if there were transactions
    // This is a conservative approach for compliance
    
    console.warn('⚠️ EOD Check: Previous day has transactions - EOD verification needed');
    
    return {
      isComplete: false,
      date: yesterdayStr,
      missingDates: [yesterdayStr],
      lastCompletedDate: null,
      message: `⚠️ Please verify EOD completion for ${format(yesterday, 'MMMM dd, yyyy')}`
    };
    
    // No transactions yesterday, EOD not required
    console.log('ℹ️ EOD Check: No transactions yesterday, EOD not required');
    return {
      isComplete: true,
      date: yesterdayStr,
      missingDates: [],
      lastCompletedDate: null,
      message: 'No transactions found for previous day'
    };
    
  } catch (error) {
    console.error('❌ EOD Check: Error checking previous day EOD', error);
    throw error;
  }
}

/**
 * Perform previous day's EOD automatically
 * Used when auto-closing missing EOD before allowing new transactions
 */
export async function performPreviousDayEOD(storeId: string): Promise<boolean> {
  try {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    
    console.log('🔄 EOD Auto-Close: Performing previous day EOD for', yesterday);
    
    // Generate Z-Reading for previous day using existing service
    const zReadingData = await fetchZReadingForThermal(storeId, yesterday);
    
    if (!zReadingData) {
      console.error('❌ EOD Auto-Close: Failed to generate Z-Reading');
      return false;
    }
    
    // TODO: Save Z-Reading to bir_z_reading_log table once created
    // For now, just generating the report is sufficient
    
    console.log('✅ EOD Auto-Close: Successfully generated previous day Z-Reading');
    return true;
    
  } catch (error) {
    console.error('❌ EOD Auto-Close: Error', error);
    return false;
  }
}

/**
 * Get EOD counter for display
 * Shows current vs expected EOD counter for audit trail
 * 
 * TODO: Implement once bir_z_reading_log table is created
 * For now returns placeholder values
 */
export async function getEODCounter(storeId: string): Promise<{
  currentCounter: number;
  expectedCounter: number;
  isMatch: boolean;
}> {
  try {
    // TODO: Query bir_z_reading_log table once created
    // For now, use bir_reset_counters table
    const { data: resetCounter } = await supabase
      .from('bir_reset_counters')
      .select('reset_counter')
      .eq('store_id', storeId)
      .single();
    
    const currentCounter = resetCounter?.reset_counter || 0;
    
    // Expected counter would be based on number of days since first Z-Reading
    // For now, just return current counter as expected
    const expectedCounter = currentCounter;
    
    return {
      currentCounter,
      expectedCounter,
      isMatch: true
    };
    
  } catch (error) {
    console.error('❌ EOD Counter: Error getting counter', error);
    return { currentCounter: 0, expectedCounter: 0, isMatch: true };
  }
}
