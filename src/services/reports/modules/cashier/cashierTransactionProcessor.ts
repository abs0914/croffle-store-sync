
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
  console.log('⚙️ Processing cashier transactions:', { 
    transactionCount: transactions.length, 
    storeId,
    userIds: [...new Set(transactions.map(tx => tx.user_id))]
  });

  // Initialize structures for data processing
  const cashierData: Record<string, CashierDataRecord> = {};
  const hourlyData = initializeHourlyData();

  // Process all transactions
  for (const tx of transactions) {
    // Handle cashier data
    const userId = tx.user_id as string;
    if (!cashierData[userId]) {
      cashierData[userId] = {
        userId,
        name: null, // Will be fetched later
        transactionCount: 0,
        totalSales: 0,
        transactionTimes: []
      };
    }

    cashierData[userId].transactionCount += 1;
    cashierData[userId].totalSales += Number(tx.total) || 0;

    // Estimate transaction time based on items
    const txItems = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
    const itemCount = Array.isArray(txItems) ? txItems.length : 1;
    const estimatedTime = Math.min(Math.max(itemCount * 0.5, 1), 10); // Between 1-10 minutes
    cashierData[userId].transactionTimes.push(estimatedTime);

    // Process hourly data
    const txDate = new Date(tx.created_at);
    const hour = txDate.getHours().toString().padStart(2, '0');

    if (hourlyData[hour]) {
      hourlyData[hour].sales += Number(tx.total) || 0;
      hourlyData[hour].transactions += 1;
    }
  }

  console.log('📊 Cashier data before name resolution:', Object.keys(cashierData).map(userId => ({
    userId,
    transactionCount: cashierData[userId].transactionCount,
    totalSales: cashierData[userId].totalSales
  })));

  // If no cashier data found in transactions, try to fetch cashiers directly
  let cashierIds = Object.keys(cashierData);

  // If no cashier data found, try to fetch app_users with cashier role for this store
  if (cashierIds.length === 0) {
    try {
      console.log('🔍 No cashier data from transactions, fetching from app_users for store:', storeId);

      const { data: appUsers, error } = await supabase
        .from("app_users")
        .select("user_id, first_name, last_name, store_ids, role")
        .eq("role", "cashier")
        .eq("is_active", true);

      if (error) {
        console.error("❌ Error fetching app_users:", error);
      } else if (appUsers && appUsers.length > 0) {
        console.log('👥 Found app_users with cashier role:', appUsers.length);
        console.log('👥 Sample user store_ids format:', appUsers[0]?.store_ids, typeof appUsers[0]?.store_ids);

        // Filter users who have access to this store (or all stores if storeId is "all")
        const storeUsers = storeId === "all"
          ? appUsers
          : appUsers.filter(user => {
              if (!user.store_ids) return false;

              // Handle both array and string formats of store_ids
              const storeIds = Array.isArray(user.store_ids)
                ? user.store_ids
                : (typeof user.store_ids === 'string' ? JSON.parse(user.store_ids) : []);

              const hasAccess = storeIds.includes(storeId);
              console.log(`👤 User ${user.first_name} ${user.last_name}: store_ids=${JSON.stringify(storeIds)}, hasAccess=${hasAccess}`);

              return hasAccess;
            });

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
      console.error("❌ Error fetching app_users for cashier data:", error);
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
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds);

      if (appUsersError) {
        console.error("❌ Error fetching app_users for names:", appUsersError);
      } else if (appUsers) {
        console.log('👥 Found app_users for name resolution:', appUsers.length);

        // Update cashier names
        appUsers.forEach(user => {
          if (cashierData[user.user_id]) {
            const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            cashierData[user.user_id].name = name || user.email || 'Unknown';
            console.log(`👤 Updated name for ${user.user_id}: ${cashierData[user.user_id].name}`);
          }
        });
      }
    } catch (error) {
      console.error("❌ Error fetching cashier names:", error);
    }
  }

  console.log('✅ Final cashier data:', Object.values(cashierData).map(c => ({
    name: c.name,
    userId: c.userId,
    transactionCount: c.transactionCount,
    totalSales: c.totalSales
  })));

  return { cashierData, hourlyDataArray };
}
