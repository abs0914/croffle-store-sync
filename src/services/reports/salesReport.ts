
import { supabase } from "@/integrations/supabase/client";
import { SalesReport } from "@/types/reports";
import { toast } from "sonner";
import { format, eachDayOfInterval, parseISO } from "date-fns";

export async function fetchSalesReport(
  storeId: string,
  from: string,
  to: string
): Promise<SalesReport | null> {
  try {
    console.log('🔍 Fetching sales report:', { storeId, from, to });

    // Build the query with proper date handling
    let transactionQuery = supabase
      .from("transactions")
      .select("*")
      .eq("status", "completed")
      .order("created_at");

    // Add store filter if not "all"
    if (storeId !== "all") {
      transactionQuery = transactionQuery.eq("store_id", storeId);
    }

    // Use improved date range handling
    if (from === to) {
      // Single date query
      transactionQuery = transactionQuery
        .gte("created_at", `${from}T00:00:00`)
        .lt("created_at", `${from}T23:59:59`);
    } else {
      // Date range query
      transactionQuery = transactionQuery
        .gte("created_at", `${from}T00:00:00`)
        .lte("created_at", `${to}T23:59:59`);
    }

    console.log('🔍 Executing sales transaction query...');
    let { data: transactions, error } = await transactionQuery;

    if (error) {
      throw error;
    }

    console.log(`📈 Sales query found ${transactions?.length || 0} transactions`);

    // If no transactions found, try alternative approach
    if (!transactions || transactions.length === 0) {
      console.warn("🔍 No sales data found with primary query, trying alternative...");
      
      const altQuery = supabase
        .from("transactions")
        .select("*")
        .eq("status", "completed")
        .order("created_at");

      if (storeId !== "all") {
        altQuery.eq("store_id", storeId);
      }

      const { data: altTransactions } = await altQuery
        .gte("created_at", `${from}T00:00:00+00:00`)
        .lte("created_at", `${from}T23:59:59+00:00`);
      
      console.log(`🔄 Alternative sales query found ${altTransactions?.length || 0} transactions`);
      
      if (altTransactions && altTransactions.length > 0) {
        transactions = altTransactions;
      }
    }

    if (!transactions || transactions.length === 0) {
      console.info("ℹ️ No sales data found for the selected period");
      return null;
    }

    // Calculate total sales and transactions
    const totalSales = transactions.reduce((sum, tx) => sum + tx.total, 0);
    const totalTransactions = transactions.length;

    console.log(`💰 Sales summary: ${totalTransactions} transactions, ₱${totalSales.toFixed(2)} total`);

    // Calculate sales by date
    const dateRange = eachDayOfInterval({
      start: parseISO(from),
      end: parseISO(to)
    });

    const salesByDate = dateRange.map(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dailyTransactions = transactions.filter(tx => 
        tx.created_at.startsWith(dateStr)
      );
      
      return {
        date: format(date, "MMM dd"),
        amount: dailyTransactions.reduce((sum, tx) => sum + tx.total, 0),
        transactions: dailyTransactions.length
      };
    });

    // Find top products
    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};
    
    transactions.forEach(tx => {
      const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
      
      items.forEach((item: any) => {
        const productId = item.productId;
        const name = item.name;
        const quantity = item.quantity;
        const totalPrice = item.totalPrice;
        
        if (!productSales[productId]) {
          productSales[productId] = {
            name,
            quantity: 0,
            revenue: 0
          };
        }
        
        productSales[productId].quantity += quantity;
        productSales[productId].revenue += totalPrice;
      });
    });
    
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate payment method breakdown
    const paymentMethods: Record<string, number> = {
      'cash': 0,
      'card': 0,
      'e-wallet': 0
    };
    
    transactions.forEach(tx => {
      const method = tx.payment_method;
      paymentMethods[method] = (paymentMethods[method] || 0) + tx.total;
    });
    
    const paymentMethodsArray = Object.entries(paymentMethods)
      .filter(([_, amount]) => amount > 0)
      .map(([method, amount]) => ({
        method: method === 'cash' ? 'Cash' : 
                method === 'card' ? 'Card' : 
                method === 'e-wallet' ? 'E-Wallet' : method,
        amount,
        percentage: (amount / totalSales) * 100
      }));

    return {
      totalSales,
      totalTransactions,
      salesByDate,
      topProducts,
      paymentMethods: paymentMethodsArray
    };
  } catch (error) {
    console.error("Error fetching sales report:", error);
    toast.error("Failed to load sales report");
    return null;
  }
}
