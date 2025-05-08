
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
    // Fetch transactions within the date range
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at");

    if (error) {
      throw error;
    }

    if (!transactions || transactions.length === 0) {
      return null;
    }

    // Calculate total sales and transactions
    const totalSales = transactions.reduce((sum, tx) => sum + tx.total, 0);
    const totalTransactions = transactions.length;

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
