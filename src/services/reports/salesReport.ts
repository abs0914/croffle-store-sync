
import { supabase } from "@/integrations/supabase/client";
import { SalesReport } from "@/types/reports";
import { toast } from "sonner";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { fetchTransactionsWithFallback, logTransactionDetails } from "./utils/transactionQueryUtils";

export async function fetchSalesReport(
  storeId: string,
  from: string,
  to: string
): Promise<SalesReport | null> {
  try {
    console.log('🔍 Fetching sales report:', { storeId, from, to });

    // Use unified transaction query
    const queryResult = await fetchTransactionsWithFallback({
      storeId,
      from,
      to,
      status: "completed",
      orderBy: "created_at",
      ascending: true
    });

    const { data: transactions, error, queryAttempts, recordCount } = queryResult;

    if (error) {
      console.error("❌ Sales report query error:", error);
      throw error;
    }

    console.log(`📈 Sales query summary:`, {
      recordCount,
      queryAttempts: queryAttempts.length,
      storeFilter: storeId !== "all" ? storeId.slice(0, 8) : "ALL_STORES"
    });

    // Log transaction details for debugging
    logTransactionDetails(transactions || [], "Sales Report");

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
      
      const dailyAmount = dailyTransactions.reduce((sum, tx) => sum + tx.total, 0);
      
      console.log(`📅 ${dateStr}: ${dailyTransactions.length} transactions, ₱${dailyAmount.toFixed(2)}`);
      
      return {
        date: format(date, "MMM dd"),
        amount: dailyAmount,
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

    console.log('🏆 Top products:', topProducts.map(p => `${p.name}: ₱${p.revenue.toFixed(2)}`));

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

    console.log('💳 Payment methods:', paymentMethodsArray.map(pm => 
      `${pm.method}: ₱${pm.amount.toFixed(2)} (${pm.percentage.toFixed(1)}%)`
    ));

    return {
      totalSales,
      totalTransactions,
      salesByDate,
      topProducts,
      paymentMethods: paymentMethodsArray
    };
  } catch (error) {
    console.error("❌ Error fetching sales report:", error);
    toast.error("Failed to load sales report");
    return null;
  }
}
