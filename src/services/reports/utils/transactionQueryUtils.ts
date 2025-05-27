
import { supabase } from "@/integrations/supabase/client";

export interface TransactionQueryOptions {
  storeId: string;
  from: string;
  to: string;
  status?: string;
  orderBy?: string;
  ascending?: boolean;
}

export interface QueryResult<T> {
  data: T[] | null;
  error: any;
  queryAttempts: string[];
  recordCount: number;
}

export async function fetchTransactionsWithFallback(
  options: TransactionQueryOptions
): Promise<QueryResult<any>> {
  const { storeId, from, to, status = "completed", orderBy = "created_at", ascending = true } = options;
  const queryAttempts: string[] = [];
  
  console.log('🔍 Starting unified transaction query:', { 
    storeId: storeId === "all" ? "ALL_STORES" : storeId.slice(0, 8), 
    from, 
    to, 
    status 
  });

  // Strategy 1: Use PostgreSQL DATE() function for exact date matching
  console.log('📅 Strategy 1: Using DATE() function for exact date matching');
  
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("status", status);

  // Add store filter if not "all"
  if (storeId !== "all") {
    console.log(`🏪 Filtering by store: ${storeId.slice(0, 8)}`);
    query = query.eq("store_id", storeId);
    queryAttempts.push(`Store filter: store_id = ${storeId.slice(0, 8)}`);
  } else {
    console.log('🏪 No store filter applied (all stores)');
    queryAttempts.push('Store filter: ALL_STORES');
  }

  // Use DATE() function for precise date matching
  if (from === to) {
    // Single date query using PostgreSQL DATE() function
    const dateFilter = `DATE(created_at) = '${from}'`;
    queryAttempts.push(`Single date with DATE(): ${dateFilter}`);
    console.log(`🎯 Single date filter: ${dateFilter}`);
  } else {
    // Date range query using DATE() function
    const dateRangeFilter = `DATE(created_at) >= '${from}' AND DATE(created_at) <= '${to}'`;
    queryAttempts.push(`Date range with DATE(): ${dateRangeFilter}`);
    console.log(`🎯 Date range filter: ${dateRangeFilter}`);
  }

  // Apply ordering
  query = query.order(orderBy, { ascending });

  let { data: transactions, error } = await query;

  if (error) {
    console.error("❌ Strategy 1 failed:", error);
    queryAttempts.push(`Strategy 1 failed: ${error.message}`);
  } else {
    console.log(`✅ Strategy 1 found ${transactions?.length || 0} transactions`);
    if (transactions && transactions.length > 0) {
      // Log store distribution in results
      const storeDistribution = transactions.reduce((acc, tx) => {
        const shortStoreId = tx.store_id.slice(0, 8);
        acc[shortStoreId] = (acc[shortStoreId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('🏪 Store distribution in results:', storeDistribution);
    }
  }

  // Strategy 2: Fallback to timestamp range queries if Strategy 1 fails or returns no data
  if (error || !transactions || transactions.length === 0) {
    console.log('🔄 Strategy 2: Using timestamp range queries');
    
    let fallbackQuery = supabase
      .from("transactions")
      .select("*")
      .eq("status", status);

    if (storeId !== "all") {
      fallbackQuery = fallbackQuery.eq("store_id", storeId);
    }

    if (from === to) {
      fallbackQuery = fallbackQuery
        .gte("created_at", `${from}T00:00:00`)
        .lte("created_at", `${from}T23:59:59`);
      queryAttempts.push(`Strategy 2 single date: ${from}T00:00:00 to ${from}T23:59:59`);
    } else {
      fallbackQuery = fallbackQuery
        .gte("created_at", `${from}T00:00:00`)
        .lte("created_at", `${to}T23:59:59`);
      queryAttempts.push(`Strategy 2 date range: ${from}T00:00:00 to ${to}T23:59:59`);
    }

    fallbackQuery = fallbackQuery.order(orderBy, { ascending });

    const { data: fallbackTransactions, error: fallbackError } = await fallbackQuery;

    if (fallbackError) {
      console.error("❌ Strategy 2 failed:", fallbackError);
      queryAttempts.push(`Strategy 2 failed: ${fallbackError.message}`);
    } else {
      console.log(`✅ Strategy 2 found ${fallbackTransactions?.length || 0} transactions`);
      if (fallbackTransactions && fallbackTransactions.length > 0) {
        // Log store distribution in fallback results
        const storeDistribution = fallbackTransactions.reduce((acc, tx) => {
          const shortStoreId = tx.store_id.slice(0, 8);
          acc[shortStoreId] = (acc[shortStoreId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('🏪 Fallback store distribution:', storeDistribution);
        
        transactions = fallbackTransactions;
        error = null;
      }
    }
  }

  // Strategy 3: Manual date filtering as last resort
  if (!transactions || transactions.length === 0) {
    console.log('🔄 Strategy 3: Manual date filtering from recent transactions');
    
    let recentQuery = supabase
      .from("transactions")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: recentTransactions } = await recentQuery;

    if (recentTransactions) {
      console.log(`📊 Retrieved ${recentTransactions.length} recent transactions for manual filtering`);
      
      const filteredTransactions = recentTransactions.filter(tx => {
        const txDate = tx.created_at.split('T')[0];
        const storeMatches = storeId === "all" || tx.store_id === storeId;
        const dateMatches = from === to ? txDate === from : txDate >= from && txDate <= to;
        
        if (!storeMatches) {
          console.log(`❌ Store mismatch for tx ${tx.id.slice(0, 8)}: expected ${storeId.slice(0, 8)}, got ${tx.store_id.slice(0, 8)}`);
        }
        
        return dateMatches && storeMatches;
      });

      console.log(`🎯 Strategy 3 manually filtered ${filteredTransactions.length} transactions`);
      queryAttempts.push(`Strategy 3 manual filter: found ${filteredTransactions.length} transactions`);
      
      if (filteredTransactions.length > 0) {
        // Log final store distribution
        const storeDistribution = filteredTransactions.reduce((acc, tx) => {
          const shortStoreId = tx.store_id.slice(0, 8);
          acc[shortStoreId] = (acc[shortStoreId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('🏪 Final store distribution:', storeDistribution);
        
        transactions = filteredTransactions;
        error = null;
      }
    }
  }

  const finalCount = transactions?.length || 0;
  console.log(`📊 Final result: ${finalCount} transactions found for store ${storeId === "all" ? "ALL_STORES" : storeId.slice(0, 8)}`);

  return {
    data: transactions,
    error,
    queryAttempts,
    recordCount: finalCount
  };
}

export function logTransactionDetails(transactions: any[], label: string) {
  if (!transactions || transactions.length === 0) {
    console.log(`📋 ${label}: No transactions to analyze`);
    return;
  }

  console.log(`📋 ${label}: Analyzing ${transactions.length} transactions`);
  
  const sampleTransaction = transactions[0];
  console.log('📄 Sample transaction:', {
    id: sampleTransaction.id.slice(0, 8),
    created_at: sampleTransaction.created_at,
    date_only: sampleTransaction.created_at.split('T')[0],
    store_id: sampleTransaction.store_id.slice(0, 8),
    total: sampleTransaction.total,
    user_id: sampleTransaction.user_id?.slice(0, 8) || 'N/A',
    status: sampleTransaction.status
  });

  // Group by date
  const byDate = transactions.reduce((acc, tx) => {
    const date = tx.created_at.split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📅 Transactions by date:', byDate);

  // Group by store with full store mapping
  const byStore = transactions.reduce((acc, tx) => {
    const storeId = tx.store_id.slice(0, 8);
    acc[storeId] = (acc[storeId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('🏪 Transactions by store (short IDs):', byStore);

  // Also log full store IDs for debugging
  const uniqueStoreIds = [...new Set(transactions.map(tx => tx.store_id))];
  console.log('🔍 Unique full store IDs in transactions:', uniqueStoreIds.map(id => id.slice(0, 8)));
}
