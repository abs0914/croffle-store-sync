
import { initializeHourlyData } from "../cashierReportUtils";
import { supabase } from "@/integrations/supabase/client";

interface CashierDataRecord {
  userId: string;
  name: string | null;
  transactionCount: number;
  totalSales: number;
  transactionTimes: number[];
}

export async function processCashierTransactions(transactions: any[], storeId: string) {
  // Initialize structures for data processing
  const cashierData: Record<string, CashierDataRecord> = {};
  const hourlyData = initializeHourlyData();
  
  // Process all transactions
  for (const tx of transactions) {
    // Handle cashier data
    const userId = tx.user_id as string;
    if (!cashierData[userId]) {
      // Safely extract cashier name
      let cashierName: string | null = null;
      
      // Define the expected shape of the cashier object 
      interface CashierObject {
        first_name?: string;
        last_name?: string;
        [key: string]: any;
      }
      
      // Check if cashier exists and is an object with expected properties
      if (tx.cashier && typeof tx.cashier === 'object') {
        // Safely typecast to our expected shape
        const cashierObj = tx.cashier as CashierObject;
        if (cashierObj && 'first_name' in cashierObj && 'last_name' in cashierObj) {
          cashierName = `${cashierObj.first_name} ${cashierObj.last_name}`;
        }
      }
      
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
      cashiers.forEach(c => {
        const userId = c.user_id;
        if (userId) {
          cashierData[userId] = {
            userId,
            name: `${c.first_name} ${c.last_name}`,
            transactionCount: 0,
            totalSales: 0,
            transactionTimes: []
          };
        }
      });
    }
  }
  
  // Convert hourly data to array format
  const hourlyDataArray = Object.entries(hourlyData).map(([hour, data]) => ({
    hour: `${hour}:00`,
    sales: data.sales,
    transactions: data.transactions
  })).filter(h => h.transactions > 0);

  return { cashierData, hourlyDataArray };
}
