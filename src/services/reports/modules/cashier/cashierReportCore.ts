
import { supabase } from "@/integrations/supabase/client";
import { CashierReport } from "@/types/reports";
import { handleReportError } from "../../utils/reportUtils";
import { processCashierTransactions } from "./cashierTransactionProcessor";
import { processAttendanceData } from "./cashierAttendanceProcessor";
import { createSampleCashierReport } from "../cashierReportUtils";
import { createReportResponse, ReportWithDataSource } from "../../utils/dataSourceUtils";
import { fetchTransactionsWithFallback, logTransactionDetails } from "../../utils/transactionQueryUtils";

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
      console.info("ℹ️ No transaction data found after unified query attempts");
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
        fallbackReason: 'No transactions found for date range after unified query attempts',
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
