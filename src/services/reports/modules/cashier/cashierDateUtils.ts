
import { supabase } from "@/integrations/supabase/client";

export async function testCashierDateQueries(storeId: string, targetDate: string) {
  console.log('🧪 Testing cashier date queries for debugging...');
  
  const queries = [
    {
      name: 'Standard ISO Date Range',
      startDate: `${targetDate}T00:00:00.000Z`,
      endDate: `${targetDate}T23:59:59.999Z`
    },
    {
      name: 'Date Only',
      startDate: targetDate,
      endDate: targetDate
    },
    {
      name: 'Local Timezone Range',
      startDate: `${targetDate}T00:00:00`,
      endDate: `${targetDate}T23:59:59`
    }
  ];

  for (const query of queries) {
    try {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("id, created_at, user_id, total")
        .eq("status", "completed")
        .eq("store_id", storeId)
        .gte("created_at", query.startDate)
        .lte("created_at", query.endDate);

      console.log(`📊 ${query.name}:`, {
        query: query,
        resultCount: transactions?.length || 0,
        error: error?.message,
        sampleDates: transactions?.slice(0, 3).map(tx => tx.created_at)
      });
    } catch (err) {
      console.error(`❌ Error with ${query.name}:`, err);
    }
  }

  // Also test for any transactions in the past week for this store
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  try {
    const { data: recentTransactions } = await supabase
      .from("transactions")
      .select("id, created_at, user_id, total")
      .eq("status", "completed")
      .eq("store_id", storeId)
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    console.log('📅 Recent transactions (past week):', {
      count: recentTransactions?.length || 0,
      dates: recentTransactions?.map(tx => ({
        created_at: tx.created_at,
        date: new Date(tx.created_at).toLocaleDateString(),
        time: new Date(tx.created_at).toLocaleTimeString()
      }))
    });
  } catch (err) {
    console.error('❌ Error fetching recent transactions:', err);
  }
}
