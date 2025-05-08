
import { supabase } from "@/integrations/supabase/client";
import { CashierReport } from "@/types/reports";
import { toast } from "sonner";
import { 
  createSampleCashierReport, 
  createSimulatedUsers, 
  initializeHourlyData
} from "./cashierReportUtils";

// Main function to fetch cashier report data
export async function fetchCashierReport(
  storeId: string,
  from: string,
  to: string
): Promise<CashierReport | null> {
  try {
    // Get transactions for the date range
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select(`
        *,
        shift_id
      `)
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at");
    
    if (txError) throw txError;
    
    if (!transactions || transactions.length === 0) {
      // For demo purposes, return sample data
      return createSampleCashierReport();
    }
    
    // Process shift and user data
    const { cashierIds, shiftToUserMap } = await processShiftData(transactions);
    
    if (cashierIds.length === 0) {
      return createSampleCashierReport();
    }
    
    // Create simulated user data
    const simulatedUsers = createSimulatedUsers(cashierIds);
    
    // Process transactions and create report data
    return processTransactionData(transactions, shiftToUserMap, simulatedUsers);
  } catch (error) {
    console.error("Error fetching cashier report:", error);
    toast.error("Failed to generate cashier performance report");
    return null;
  }
}

// Helper function to process shift data and extract user info
async function processShiftData(transactions: any[]) {
  // Get shift data to find user IDs
  const shiftIds = transactions.map(tx => tx.shift_id).filter(Boolean);
  
  const { data: shifts, error: shiftsError } = await supabase
    .from("shifts")
    .select("id, user_id")
    .in("id", shiftIds);
  
  if (shiftsError) {
    console.error("Error fetching shifts:", shiftsError);
    // Continue with available data
  }
  
  // Create a map of shift IDs to user IDs
  const shiftToUserMap: Record<string, string> = {};
  shifts?.forEach(shift => {
    shiftToUserMap[shift.id] = shift.user_id;
  });
  
  // Extract unique cashier IDs
  const cashierIds = Array.from(
    new Set(
      transactions
        .map(tx => tx.shift_id && shiftToUserMap[tx.shift_id])
        .filter(Boolean)
    )
  );
  
  return { cashierIds, shiftToUserMap };
}

// Process transactions and generate the cashier report
function processTransactionData(
  transactions: any[], 
  shiftToUserMap: Record<string, string>,
  simulatedUsers: Record<string, { name: string, avatar?: string }>
): CashierReport {
  // Initialize cashier data and hourly data
  const cashierData: Record<string, {
    name: string,
    avatar?: string,
    transactionCount: number,
    totalSales: number,
    totalTime: number,
    transactions: Array<{
      time: number,
      amount: number,
      hour: string
    }>
  }> = {};
  
  // Initialize hour data
  const hourlyData = initializeHourlyData();
  
  // Process each transaction
  transactions.forEach(tx => {
    const userId = tx.shift_id && shiftToUserMap[tx.shift_id];
    const hour = new Date(tx.created_at).getHours().toString().padStart(2, '0');
    
    // Update hourly data
    hourlyData[hour].sales += tx.total;
    hourlyData[hour].transactions += 1;
    
    if (!userId) return;
    
    const userInfo = simulatedUsers[userId];
    if (!userInfo) return;
    
    if (!cashierData[userId]) {
      cashierData[userId] = {
        name: userInfo.name,
        avatar: userInfo.avatar,
        transactionCount: 0,
        totalSales: 0,
        totalTime: 0,
        transactions: []
      };
    }
    
    // Simulate transaction time (between 1-5 minutes)
    const transactionTime = 1 + Math.floor(Math.random() * 4);
    
    cashierData[userId].transactionCount += 1;
    cashierData[userId].totalSales += tx.total;
    cashierData[userId].totalTime += transactionTime;
    cashierData[userId].transactions.push({
      time: transactionTime,
      amount: tx.total,
      hour
    });
  });
  
  // Convert to array and calculate averages
  const cashiers = Object.entries(cashierData).map(([userId, data]) => ({
    name: data.name,
    avatar: data.avatar,
    transactionCount: data.transactionCount,
    totalSales: data.totalSales,
    averageTransactionValue: data.totalSales / data.transactionCount,
    averageTransactionTime: Math.round((data.totalTime / data.transactionCount) * 10) / 10
  }));
  
  // Convert hourly data to array
  const hourlyDataArray = Object.entries(hourlyData)
    .filter(([_, data]) => data.transactions > 0)
    .map(([hour, data]) => ({
      hour: `${hour}:00`,
      sales: data.sales,
      transactions: data.transactions
    }));
  
  // Calculate overall report metrics
  const totalTransactions = transactions.length;
  const totalSales = transactions.reduce((sum, tx) => sum + tx.total, 0);
  const averageTransactionValue = totalSales / totalTransactions;
  
  // Calculate average transaction time across all cashiers
  const averageTransactionTime = cashiers.reduce((sum, cashier) => 
    sum + (cashier.averageTransactionTime * cashier.transactionCount), 0
  ) / totalTransactions;

  return {
    cashierCount: cashiers.length,
    totalTransactions,
    averageTransactionValue,
    averageTransactionTime,
    cashiers,
    hourlyData: hourlyDataArray
  };
}
