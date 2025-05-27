
import { supabase } from "@/integrations/supabase/client";

interface CashierData {
  name: string;
  transactionCount: number;
  totalSales: number;
  transactionTimes: number[];
}

interface HourlyData {
  hour: string;
  sales: number;
  transactions: number;
}

export async function processCashierTransactions(
  transactions: any[],
  storeId: string
): Promise<{
  cashierData: Record<string, CashierData>;
  hourlyDataArray: HourlyData[];
}> {
  console.log(`📊 Processing ${transactions.length} transactions for cashier report`);
  
  const cashierData: Record<string, CashierData> = {};
  const hourlyData: Record<string, HourlyData> = {};

  // Get cashier names from app_users table
  const userIds = [...new Set(transactions.map(tx => tx.user_id))];
  console.log(`👥 Found ${userIds.length} unique cashier IDs:`, userIds);

  let cashierNames: Record<string, string> = {};
  
  if (userIds.length > 0) {
    try {
      const { data: users } = await supabase
        .from('app_users')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      if (users) {
        cashierNames = users.reduce((acc, user) => {
          acc[user.user_id] = `${user.first_name} ${user.last_name}`;
          return acc;
        }, {} as Record<string, string>);
        console.log('👤 Cashier names mapped:', cashierNames);
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch cashier names from app_users:', error);
    }
  }

  // Process each transaction
  transactions.forEach((transaction) => {
    const userId = transaction.user_id;
    const cashierName = cashierNames[userId] || `Cashier ${userId.slice(0, 8)}`;
    const transactionAmount = parseFloat(transaction.total) || 0;
    const transactionDate = new Date(transaction.created_at);
    const hour = transactionDate.getHours().toString().padStart(2, '0') + ':00';

    // Initialize cashier data if not exists
    if (!cashierData[userId]) {
      cashierData[userId] = {
        name: cashierName,
        transactionCount: 0,
        totalSales: 0,
        transactionTimes: []
      };
    }

    // Update cashier data
    cashierData[userId].transactionCount++;
    cashierData[userId].totalSales += transactionAmount;
    cashierData[userId].transactionTimes.push(2.5); // Default transaction time in minutes

    // Initialize hourly data if not exists
    if (!hourlyData[hour]) {
      hourlyData[hour] = {
        hour,
        sales: 0,
        transactions: 0
      };
    }

    // Update hourly data
    hourlyData[hour].sales += transactionAmount;
    hourlyData[hour].transactions++;
  });

  // Convert hourly data to array and sort by hour
  const hourlyDataArray = Object.values(hourlyData).sort((a, b) => 
    parseInt(a.hour.split(':')[0]) - parseInt(b.hour.split(':')[0])
  );

  console.log('📈 Transaction processing complete:', {
    cashiersFound: Object.keys(cashierData).length,
    hourlyDataPoints: hourlyDataArray.length,
    totalTransactions: transactions.length,
    totalSales: Object.values(cashierData).reduce((sum, c) => sum + c.totalSales, 0)
  });

  return { cashierData, hourlyDataArray };
}
