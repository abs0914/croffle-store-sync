import { supabase } from "@/integrations/supabase/client";
import { CashierReport } from "@/types/reports";
import { createSimulatedUsers, initializeHourlyData, createSampleCashierReport } from "./cashierReportUtils";
import { handleReportError } from "../utils/reportUtils";
import { format } from "date-fns";

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
    
    if (!transactions || transactions.length === 0) {
      console.info("No transaction data found, using sample data");
      return createSampleCashierReport();
    }

    // Initialize structures for data processing
    const cashierData: Record<string, {
      userId: string;
      name: string | null;
      transactionCount: number;
      totalSales: number;
      transactionTimes: number[];
    }> = {};
    
    const hourlyData = initializeHourlyData();
    
    // Process all transactions
    for (const tx of transactions) {
      // Handle cashier data
      const userId = tx.user_id as string;
      if (!cashierData[userId]) {
        // Check if cashier object exists and has a name property
        const cashierName = tx.cashier && typeof tx.cashier === 'object' && 'name' in tx.cashier 
          ? tx.cashier.name 
          : null;
        
        cashierData[userId] = {
          userId,
          name: cashierName,
          transactionCount: 0,
          totalSales: 0,
          transactionTimes: []
        };
      }
      
      cashierData[userId].transactionCount += 1;
      cashierData[userId].totalSales += tx.total || 0;
      
      // We're approximating transaction time as 2-5 minutes based on transaction amount
      const txItems = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
      const itemCount = txItems?.length || 1;
      const estimatedTime = Math.min(Math.max(itemCount * 0.5, 1), 10); // Between 1-10 minutes
      cashierData[userId].transactionTimes.push(estimatedTime);
      
      // Process hourly data
      const txDate = new Date(tx.created_at);
      const hour = txDate.getHours().toString().padStart(2, '0');
      
      if (hourlyData[hour]) {
        hourlyData[hour].sales += tx.total || 0;
        hourlyData[hour].transactions += 1;
      }
    }
    
    // If no cashier data found in transactions, try to fetch cashiers directly
    let cashierIds = Object.keys(cashierData);
    
    // If no cashier data found, create simulated data for demo purposes
    if (cashierIds.length === 0) {
      const { data: cashiers } = await supabase
        .from("cashiers")
        .select("user_id, first_name, last_name")
        .eq("store_id", storeId)
        .eq("is_active", true);
      
      if (cashiers && cashiers.length > 0) {
        const simulatedUsers = createSimulatedUsers(
          cashiers.map(c => c.user_id)
        );
        
        cashiers.forEach(c => {
          const userId = c.user_id;
          cashierData[userId] = {
            userId,
            name: `${c.first_name} ${c.last_name}`,
            transactionCount: 0,
            totalSales: 0,
            transactionTimes: []
          };
        });
        
        cashierIds = Object.keys(cashierData);
      } else {
        console.info("No cashier data found, using sample data");
        return createSampleCashierReport();
      }
    }
    
    // Convert hourly data to array format
    const hourlyDataArray = Object.entries(hourlyData).map(([hour, data]) => ({
      hour: `${hour}:00`,
      sales: data.sales,
      transactions: data.transactions
    })).filter(h => h.transactions > 0);
    
    // Calculate totals
    const totalTransactions = Object.values(cashierData).reduce((sum, c) => sum + c.transactionCount, 0);
    const totalSales = Object.values(cashierData).reduce((sum, c) => sum + c.totalSales, 0);
    const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    
    // Convert cashier data to array format with calculated averages
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
    
    const avgTransactionTime = cashiers.length > 0 
      ? cashiers.reduce((sum, c) => sum + c.averageTransactionTime, 0) / cashiers.length 
      : 0;

    return {
      cashierCount: cashiers.length,
      totalTransactions,
      averageTransactionValue,
      averageTransactionTime: avgTransactionTime,
      cashiers,
      hourlyData: hourlyDataArray
    };
  } catch (error) {
    return handleReportError("Cashier Report", error);
  }
}
