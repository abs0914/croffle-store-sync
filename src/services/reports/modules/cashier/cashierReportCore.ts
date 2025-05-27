
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

    // Use PostgreSQL date functions for proper timezone handling
    // This ensures we get the full day in the database's timezone
    const queryAttempts: string[] = [];

    console.log('📅 Using PostgreSQL date functions for date range:', { 
      originalFrom: from, 
      originalTo: to,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Build transaction query with PostgreSQL date functions
    let transactionQuery = supabase
      .from("transactions")
      .select("*")
      .eq("status", "completed")
      .gte("created_at", from)
      .lt("created_at", `${new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`);

    // Only filter by store_id if not "all"
    if (storeId !== "all") {
      transactionQuery = transactionQuery.eq("store_id", storeId);
    }

    queryAttempts.push(`PostgreSQL date range: ${from} to next day`);
    console.log('🔍 Executing transaction query for store:', storeId);
    console.log('📊 Query details:', {
      from_date: from,
      to_date_exclusive: new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      store_filter: storeId !== "all" ? storeId : "ALL_STORES"
    });

    let { data: transactions, error: txError } = await transactionQuery;

    if (txError) {
      console.error("❌ Transaction fetch error:", txError);
      throw txError;
    }

    console.log(`📈 Found ${transactions?.length || 0} transactions with PostgreSQL date functions`);

    // If no transactions found with standard query, try alternative date queries
    if (!transactions || transactions.length === 0) {
      console.warn("🔍 No data found with PostgreSQL date query, trying alternative approaches...");
      
      // Try using date_trunc for exact date matching
      const altQuery = supabase
        .from("transactions")
        .select("*")
        .eq("status", "completed")
        .gte("created_at", `${from}T00:00:00`)
        .lt("created_at", `${from}T23:59:59`);

      if (storeId !== "all") {
        altQuery.eq("store_id", storeId);
      }

      const { data: altTransactions } = await altQuery;
      console.log(`🔄 Alternative query found ${altTransactions?.length || 0} transactions`);
      
      if (altTransactions && altTransactions.length > 0) {
        transactions = altTransactions;
        queryAttempts.push(`Alternative time range: ${from}T00:00:00 to ${from}T23:59:59`);
      }
    }

    // Build shifts query with the same date logic
    let shiftsQuery = supabase
      .from("shifts")
      .select("*")
      .gte("start_time", from)
      .lt("start_time", `${new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`);

    // Only filter by store_id if not "all"
    if (storeId !== "all") {
      shiftsQuery = shiftsQuery.eq("store_id", storeId);
    }

    console.log('🔍 Executing shifts query for store:', storeId);
    const { data: shifts, error: shiftsError } = await shiftsQuery;

    if (shiftsError) {
      console.error("❌ Shifts fetch error:", shiftsError);
      throw shiftsError;
    }

    console.log(`⏰ Found ${shifts?.length || 0} shifts`);

    // If still no transaction data found, try one more comprehensive query
    if (!transactions || transactions.length === 0) {
      console.log("🔍 Trying comprehensive date query to find any recent data...");
      
      // Get all transactions for this store in the past week for debugging
      const { data: recentTransactions } = await supabase
        .from("transactions")
        .select("id, created_at, user_id, total, store_id")
        .eq("status", "completed")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(10);

      console.log('📅 Recent transactions for debugging:', recentTransactions?.map(tx => ({
        id: tx.id,
        created_at: tx.created_at,
        date: new Date(tx.created_at).toLocaleDateString(),
        targetDate: from,
        store_id: tx.store_id
      })));

      // Try exact date match using date functions
      const { data: exactDateTransactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("status", "completed")
        .eq("store_id", storeId)
        .filter("created_at", "gte", `${from}T00:00:00+00:00`)
        .filter("created_at", "lte", `${to}T23:59:59+00:00`);

      if (exactDateTransactions && exactDateTransactions.length > 0) {
        console.log(`✅ Found ${exactDateTransactions.length} transactions with exact date+timezone query`);
        transactions = exactDateTransactions;
        queryAttempts.push(`Exact date with timezone: ${from}T00:00:00+00:00 to ${to}T23:59:59+00:00`);
      }
    }

    // If still no data, return empty report with debug info
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
