
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
      // We'll fetch cashier names separately since we can't join directly
      let cashierName: string | null = null;

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

  // If no cashier data found, try to fetch app_users with cashier role for this store
  if (cashierIds.length === 0) {
    try {
      console.log('🔍 No cashier data from transactions, fetching from app_users for store:', storeId);

      const { data: appUsers } = await supabase
        .from("app_users")
        .select("user_id, first_name, last_name, store_ids")
        .eq("role", "cashier")
        .eq("is_active", true);

      if (appUsers && appUsers.length > 0) {
        console.log('👥 Found app_users with cashier role:', appUsers.length);

        // Filter users who have access to this store (or all stores if storeId is "all")
        const storeUsers = storeId === "all"
          ? appUsers
          : appUsers.filter(user =>
              user.store_ids && user.store_ids.includes(storeId)
            );

        console.log('👥 Filtered users for store', storeId, ':', storeUsers.length);

        storeUsers.forEach(user => {
          const userId = user.user_id;
          if (userId) {
            cashierData[userId] = {
              userId,
              name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
              transactionCount: 0,
              totalSales: 0,
              transactionTimes: []
            };
          }
        });
      }
    } catch (error) {
      console.error("Error fetching app_users for cashier data:", error);
    }
  }

  // Convert hourly data to array format
  const hourlyDataArray = Object.entries(hourlyData).map(([hour, data]) => ({
    hour: `${hour}:00`,
    sales: data.sales,
    transactions: data.transactions
  })).filter(h => h.transactions > 0 || h.sales > 0);

  // Now fetch cashier names for all user IDs we found
  const userIds = Object.keys(cashierData);
  if (userIds.length > 0) {
    try {
      console.log('👥 Fetching cashier names for user IDs:', userIds);

      // Fetch from app_users table
      const { data: appUsers, error: appUsersError } = await supabase
        .from("app_users")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      if (appUsersError) {
        console.error("Error fetching app_users:", appUsersError);
      } else if (appUsers) {
        console.log('👥 Found app_users:', appUsers.length);

        // Update cashier names
        appUsers.forEach(user => {
          if (cashierData[user.user_id]) {
            const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            cashierData[user.user_id].name = name || 'Unknown';
          }
        });
      }
    } catch (error) {
      console.error("Error fetching cashier names:", error);
    }
  }

  return { cashierData, hourlyDataArray };
}
