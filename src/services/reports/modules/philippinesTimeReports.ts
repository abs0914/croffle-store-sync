/**
 * Philippines Timezone Standardized Report Utilities
 * 
 * All report date queries and formatting should use these utilities
 * to ensure consistent Philippines timezone handling
 */

import { supabase } from "@/integrations/supabase/client";
import { getDateRangeInPhilippines } from "@/utils/timezone";
import { handleReportError } from "../utils/reportUtils";

/**
 * Get transactions within date range using Philippines timezone
 */
export async function getTransactionsInDateRange(
  storeId: string | 'all',
  fromDate: string,
  toDate: string,
  status: string = 'completed'
) {
  try {
    const dateRange = getDateRangeInPhilippines(fromDate, toDate);
    
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("status", status)
      .gte("created_at", dateRange.from)
      .lte("created_at", dateRange.to);

    if (storeId !== 'all') {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data, dateRange };
    
  } catch (error) {
    console.error('Error fetching transactions in date range:', error);
    return { data: null, dateRange: null, error };
  }
}

/**
 * Get expenses within date range using Philippines timezone
 */
export async function getExpensesInDateRange(
  storeId: string | 'all',
  fromDate: string,
  toDate: string
) {
  try {
    const dateRange = getDateRangeInPhilippines(fromDate, toDate);
    
    let query = supabase
      .from("expenses")
      .select(`
        *,
        expense_categories (name),
        stores (name)
      `)
      .gte("expense_date", dateRange.localFrom.split('T')[0])
      .lte("expense_date", dateRange.localTo.split('T')[0]);

    if (storeId !== 'all') {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query.order('expense_date', { ascending: false });
    
    if (error) throw error;
    return { data, dateRange };
    
  } catch (error) {
    console.error('Error fetching expenses in date range:', error);
    return { data: null, dateRange: null, error };
  }
}

/**
 * Standardized date range validation for reports
 */
export function validateReportDateRange(fromDate: string, toDate: string): {
  valid: boolean;
  error?: string;
  daysDifference?: number;
} {
  try {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (from > to) {
      return { valid: false, error: "Start date must be before end date" };
    }
    
    const daysDifference = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > 366) {
      return { valid: false, error: "Date range cannot exceed 1 year" };
    }
    
    return { valid: true, daysDifference };
    
  } catch (error) {
    return { valid: false, error: "Invalid date format" };
  }
}