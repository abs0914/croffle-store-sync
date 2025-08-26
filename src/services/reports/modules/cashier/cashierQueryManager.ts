
import { supabase } from "@/integrations/supabase/client";
import { fetchTransactionsWithFallback, logTransactionDetails } from "../../utils/transactionQueryUtils";

export interface CashierQueryResult {
  transactions: any[] | null;
  shifts: any[] | null;
  queryAttempts: string[];
  recordCount: number;
}

export async function fetchCashierData(
  storeId: string,
  from: string,
  to: string
): Promise<CashierQueryResult> {
  console.log('🔍 Fetching cashier data:', { storeId, from, to });

  // Use unified transaction query
  const queryResult = await fetchTransactionsWithFallback({
    storeId,
    from,
    to,
    status: "completed",
    orderBy: "created_at",
    ascending: true
  });

  const { data: transactions, error: txError, queryAttempts, recordCount } = queryResult;

  if (txError) {
    console.error("❌ Cashier report transaction query error:", txError);
    throw txError;
  }

  console.log(`👥 Cashier query summary:`, {
    recordCount,
    queryAttempts: queryAttempts.length,
    storeFilter: storeId !== "all" ? storeId.slice(0, 8) : "ALL_STORES"
  });

  // Log transaction details for debugging
  logTransactionDetails(transactions || [], "Cashier Report");

  // Handle shifts query with unified approach
  let shiftsQuery = supabase
    .from("shifts")
    .select("*");

  if (storeId !== "all") {
    shiftsQuery = shiftsQuery.eq("store_id", storeId);
  }

  // Enhanced date logic for shifts to include active shifts that span the report period
  if (from === to) {
    // For single day reports: include shifts that started on or before this day and ended on or after this day (or are still active)
    shiftsQuery = shiftsQuery
      .lte("start_time", `${from}T23:59:59`)
      .or(`end_time.gte.${from}T00:00:00,end_time.is.null`);
  } else {
    // For date range reports: include shifts that overlap with the report period
    shiftsQuery = shiftsQuery
      .lte("start_time", `${to}T23:59:59`)
      .or(`end_time.gte.${from}T00:00:00,end_time.is.null`);
  }

  console.log('🔍 Executing shifts query...');
  const { data: shifts, error: shiftsError } = await shiftsQuery;

  if (shiftsError) {
    console.error("❌ Shifts fetch error:", shiftsError);
    throw shiftsError;
  }

  console.log(`⏰ Found ${shifts?.length || 0} shifts`);

  return {
    transactions,
    shifts,
    queryAttempts,
    recordCount
  };
}
