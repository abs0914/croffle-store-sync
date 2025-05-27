
import { supabase } from "@/integrations/supabase/client";
import { CashierReport } from "@/types/reports";
import { handleReportError } from "../../utils/reportUtils";
import { processCashierTransactions } from "./cashierTransactionProcessor";
import { processAttendanceData } from "./cashierAttendanceProcessor";
import { createSampleCashierReport } from "../cashierReportUtils";
import { createReportResponse, ReportWithDataSource } from "../../utils/dataSourceUtils";

export async function fetchCashierReport(
  storeId: string,
  from: string,
  to: string,
  useSampleData = false
): Promise<ReportWithDataSource<CashierReport> | null> {
  try {
    console.log('🔍 Fetching cashier report:', { storeId, from, to, useSampleData });

    if (useSampleData) {
      console.log('📊 Using sample data as requested');
      const sampleData = createSampleCashierReport();
      return createReportResponse(sampleData, 'sample', {
        fallbackReason: 'Explicitly requested sample data'
      });
    }

    const queryAttempts: string[] = [];

    // First, let's try the most straightforward approach - exact date matching
    console.log('📅 Trying exact date matching for:', { 
      originalFrom: from, 
      originalTo: to,
      storeId: storeId !== "all" ? storeId : "ALL_STORES"
    });

    // Strategy 1: Use DATE() function to match by date only
    let transactionQuery = supabase
      .from("transactions")
      .select("*")
      .eq("status", "completed");

    // Add store filter if not "all"
    if (storeId !== "all") {
      transactionQuery = transactionQuery.eq("store_id", storeId);
    }

    // Use PostgreSQL DATE() function for exact date matching
    if (from === to) {
      // Single date query
      transactionQuery = transactionQuery
        .gte("created_at", `${from}T00:00:00`)
        .lt("created_at", `${from}T23:59:59`);
      queryAttempts.push(`Single date: ${from}T00:00:00 to ${from}T23:59:59`);
    } else {
      // Date range query
      transactionQuery = transactionQuery
        .gte("created_at", `${from}T00:00:00`)
        .lte("created_at", `${to}T23:59:59`);
      queryAttempts.push(`Date range: ${from}T00:00:00 to ${to}T23:59:59`);
    }

    console.log('🔍 Executing primary transaction query...');
    let { data: transactions, error: txError } = await transactionQuery;

    if (txError) {
      console.error("❌ Transaction fetch error:", txError);
      throw txError;
    }

    console.log(`📈 Primary query found ${transactions?.length || 0} transactions`);

    // If no transactions found, try alternative approaches
    if (!transactions || transactions.length === 0) {
      console.warn("🔍 No data found with primary query, trying alternative approaches...");
      
      // Strategy 2: Try with timezone-aware queries
      const altQuery = supabase
        .from("transactions")
        .select("*")
        .eq("status", "completed");

      if (storeId !== "all") {
        altQuery.eq("store_id", storeId);
      }

      // Try different timezone formats
      const { data: altTransactions } = await altQuery
        .gte("created_at", `${from}T00:00:00+00:00`)
        .lte("created_at", `${from}T23:59:59+00:00`);
      
      queryAttempts.push(`Timezone aware: ${from}T00:00:00+00:00 to ${from}T23:59:59+00:00`);
      console.log(`🔄 Timezone-aware query found ${altTransactions?.length || 0} transactions`);
      
      if (altTransactions && altTransactions.length > 0) {
        transactions = altTransactions;
      }
    }

    // Strategy 3: If still no data, try a broader search to see what's available
    if (!transactions || transactions.length === 0) {
      console.log("🔍 Trying broader search to find any data...");
      
      const { data: recentTransactions } = await supabase
        .from("transactions")
        .select("id, created_at, user_id, total, store_id, status")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(20);

      console.log('📅 Recent transactions in database:', recentTransactions?.map(tx => ({
        id: tx.id.slice(0, 8),
        created_at: tx.created_at,
        date_only: tx.created_at.split('T')[0],
        store_id: tx.store_id.slice(0, 8),
        total: tx.total,
        target_date: from,
        matches_date: tx.created_at.startsWith(from),
        matches_store: storeId === "all" || tx.store_id === storeId
      })));

      // Strategy 4: Try to find exact matches manually
      if (recentTransactions) {
        const matchingTransactions = recentTransactions.filter(tx => {
          const txDate = tx.created_at.split('T')[0];
          const storeMatches = storeId === "all" || tx.store_id === storeId;
          return txDate === from && storeMatches;
        });

        console.log(`🎯 Found ${matchingTransactions.length} manually matched transactions`);
        
        if (matchingTransactions.length > 0) {
          // Get full transaction data for the matched IDs
          const { data: fullTransactions } = await supabase
            .from("transactions")
            .select("*")
            .in("id", matchingTransactions.map(tx => tx.id));
          
          if (fullTransactions && fullTransactions.length > 0) {
            transactions = fullTransactions;
            queryAttempts.push(`Manual matching: found ${fullTransactions.length} transactions`);
            console.log(`✅ Successfully retrieved ${fullTransactions.length} transactions via manual matching`);
          }
        }
      }
    }

    // Handle shifts query with similar approach
    let shiftsQuery = supabase
      .from("shifts")
      .select("*");

    if (storeId !== "all") {
      shiftsQuery = shiftsQuery.eq("store_id", storeId);
    }

    // Use the same date approach for shifts
    if (from === to) {
      shiftsQuery = shiftsQuery
        .gte("start_time", `${from}T00:00:00`)
        .lt("start_time", `${from}T23:59:59`);
    } else {
      shiftsQuery = shiftsQuery
        .gte("start_time", `${from}T00:00:00`)
        .lte("start_time", `${to}T23:59:59`);
    }

    console.log('🔍 Executing shifts query...');
    const { data: shifts, error: shiftsError } = await shiftsQuery;

    if (shiftsError) {
      console.error("❌ Shifts fetch error:", shiftsError);
      throw shiftsError;
    }

    console.log(`⏰ Found ${shifts?.length || 0} shifts`);

    // If still no transaction data found, return empty report with debug info
    if (!transactions || transactions.length === 0) {
      console.info("ℹ️ No transaction data found after all query attempts");
      const emptyReport: CashierReport = {
        cashierCount: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        averageTransactionTime: 0,
        cashiers: [],
        hourlyData: [],
        attendance: []
      };
      
      return createReportResponse(emptyReport, 'real', {
        queryAttempts,
        fallbackReason: 'No transactions found for date range after multiple query attempts',
        recordCount: 0
      });
    }

    // Process the transaction data
    console.log(`⚙️ Processing ${transactions.length} transactions...`);
    const { cashierData, hourlyDataArray } = await processCashierTransactions(transactions || [], storeId);

    // Process attendance data
    console.log('⚙️ Processing attendance data...');
    const attendanceData = await processAttendanceData(shifts || [], cashierData);

    // Calculate totals
    const cashiers = Object.values(cashierData).map(c => {
      const avgTxValue = c.transactionCount > 0 ? c.totalSales / c.transactionCount : 0;
      const avgTxTime = c.transactionTimes.length > 0
        ? c.transactionTimes.reduce((sum, time) => sum + time, 0) / c.transactionTimes.length
        : 2.5; // Default value if no transactions

      // Generate avatar from name if available
      const avatar = c.name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}`
        : undefined;

      return {
        name: c.name || "Unknown Cashier",
        avatar,
        transactionCount: c.transactionCount,
        totalSales: c.totalSales,
        averageTransactionValue: avgTxValue,
        averageTransactionTime: avgTxTime
      };
    }).sort((a, b) => b.totalSales - a.totalSales);

    // Calculate final statistics
    const totalTransactions = Object.values(cashierData).reduce((sum, c) => sum + c.transactionCount, 0);
    const totalSales = Object.values(cashierData).reduce((sum, c) => sum + c.totalSales, 0);
    const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const avgTransactionTime = cashiers.length > 0
      ? cashiers.reduce((sum, c) => sum + c.averageTransactionTime, 0) / cashiers.length
      : 0;

    console.log('📈 Cashier report generated successfully:', {
      cashierCount: cashiers.length,
      totalTransactions,
      totalSales: totalSales.toFixed(2),
      cashierNames: cashiers.map(c => c.name),
      dateRange: { from, to },
      storeId,
      dataFound: transactions.length > 0
    });

    const finalReport: CashierReport = {
      cashierCount: cashiers.length,
      totalTransactions,
      averageTransactionValue,
      averageTransactionTime: avgTransactionTime,
      cashiers,
      hourlyData: hourlyDataArray,
      attendance: attendanceData
    };

    return createReportResponse(finalReport, 'real', {
      queryAttempts,
      recordCount: transactions?.length || 0
    });
  } catch (error) {
    console.error("❌ Cashier report generation error:", error);
    return handleReportError("Cashier Report", error);
  }
}
