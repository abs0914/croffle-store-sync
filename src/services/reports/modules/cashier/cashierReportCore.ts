
import { supabase } from "@/integrations/supabase/client";
import { CashierReport } from "@/types/reports";
import { handleReportError } from "../../utils/reportUtils";
import { processCashierTransactions } from "./cashierTransactionProcessor";
import { processAttendanceData } from "./cashierAttendanceProcessor";
import { createSampleCashierReport } from "../cashierReportUtils";

export async function fetchCashierReport(
  storeId: string,
  from: string,
  to: string,
  useSampleData = false
): Promise<CashierReport | null> {
  try {
    console.log('🔍 Fetching cashier report:', { storeId, from, to, useSampleData });

    if (useSampleData) {
      console.log('📊 Using sample data as requested');
      return createSampleCashierReport();
    }

    // Create proper date range with timezone handling
    const startDate = `${from}T00:00:00.000Z`;
    const endDate = `${to}T23:59:59.999Z`;
    
    console.log('📅 Date range being used:', { 
      originalFrom: from, 
      originalTo: to,
      startDate, 
      endDate,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Build transaction query with improved date filtering
    let transactionQuery = supabase
      .from("transactions")
      .select("*")
      .eq("status", "completed")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    // Only filter by store_id if not "all"
    if (storeId !== "all") {
      transactionQuery = transactionQuery.eq("store_id", storeId);
    }

    console.log('🔍 Executing transaction query for store:', storeId);
    const { data: transactions, error: txError } = await transactionQuery;

    if (txError) {
      console.error("❌ Transaction fetch error:", txError);
      throw txError;
    }

    console.log('💳 Transactions fetched:', {
      count: transactions?.length || 0,
      storeId,
      sampleTransactions: transactions?.slice(0, 3).map(tx => ({
        id: tx.id,
        user_id: tx.user_id,
        total: tx.total,
        created_at: tx.created_at,
        store_id: tx.store_id
      }))
    });

    // Build shifts query with improved date filtering
    let shiftsQuery = supabase
      .from("shifts")
      .select("*")
      .gte("start_time", startDate)
      .lte("start_time", endDate);

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

    console.log('⏰ Shifts fetched:', {
      count: shifts?.length || 0,
      storeId,
      sampleShifts: shifts?.slice(0, 3).map(shift => ({
        id: shift.id,
        user_id: shift.user_id,
        start_time: shift.start_time,
        end_time: shift.end_time,
        store_id: shift.store_id
      }))
    });

    // If no data found, try alternative date queries for debugging
    if ((!transactions || transactions.length === 0) && (!shifts || shifts.length === 0)) {
      console.warn("🔍 No data found with standard query, trying alternative date formats...");
      
      // Try querying without time constraints to see if data exists at all
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("created_at, store_id, user_id, total")
        .eq("status", "completed")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(5);
        
      console.log('🔍 Recent transactions for debugging:', allTransactions?.map(tx => ({
        created_at: tx.created_at,
        date: new Date(tx.created_at).toISOString().split('T')[0],
        targetDate: from,
        matches: new Date(tx.created_at).toISOString().split('T')[0] === from
      })));

      // Try date-only comparison
      const { data: dateOnlyTransactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("status", "completed")
        .gte("created_at", from)
        .lt("created_at", new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .eq("store_id", storeId);
        
      console.log('🔍 Date-only query results:', dateOnlyTransactions?.length || 0);

      if (dateOnlyTransactions && dateOnlyTransactions.length > 0) {
        console.log('✅ Found transactions with date-only query, using these instead');
        transactions = dateOnlyTransactions;
      } else {
        console.info("ℹ️ No transaction or shift data found for the selected date range and store");
        return {
          cashierCount: 0,
          totalTransactions: 0,
          averageTransactionValue: 0,
          averageTransactionTime: 0,
          cashiers: [],
          hourlyData: [],
          attendance: []
        };
      }
    }

    // Process the transaction data
    console.log('⚙️ Processing transaction data...');
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

    console.log('📈 Cashier report generated:', {
      cashierCount: cashiers.length,
      totalTransactions,
      totalSales: totalSales.toFixed(2),
      cashierNames: cashiers.map(c => c.name),
      dateRange: { from, to },
      storeId
    });

    return {
      cashierCount: cashiers.length,
      totalTransactions,
      averageTransactionValue,
      averageTransactionTime: avgTransactionTime,
      cashiers,
      hourlyData: hourlyDataArray,
      attendance: attendanceData
    };
  } catch (error) {
    console.error("❌ Cashier report generation error:", error);
    return handleReportError("Cashier Report", error);
  }
}
