
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
    if (useSampleData) {
      // For demo purposes, return sample data when requested
      return createSampleCashierReport();
    }

    // Get all transactions for the date range
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*, cashier:user_id(*)")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`);
    
    if (txError) throw txError;
    
    // Get all shifts for the date range
    const { data: shifts, error: shiftsError } = await supabase
      .from("shifts")
      .select("*, cashier:cashier_id(*)")
      .eq("store_id", storeId)
      .gte("start_time", `${from}T00:00:00`)
      .lte("start_time", `${to}T23:59:59`);
    
    if (shiftsError) throw shiftsError;
    
    // If no data found, return sample data
    if ((!transactions || transactions.length === 0) && (!shifts || shifts.length === 0)) {
      console.info("No transaction or shift data found, using sample data");
      return createSampleCashierReport();
    }

    // Process the transaction data
    const { cashierData, hourlyDataArray } = await processCashierTransactions(transactions, storeId);
    
    // Process attendance data
    const attendanceData = await processAttendanceData(shifts, cashierData);
    
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
    return handleReportError("Cashier Report", error);
  }
}
