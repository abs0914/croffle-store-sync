
import { supabase } from "@/integrations/supabase/client";
import { ProfitLossReport } from "@/types/reports";
import { toast } from "sonner";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { fetchTransactionsWithFallback, logTransactionDetails } from "./utils/transactionQueryUtils";
import { formatCurrency } from "@/utils/format";

export async function fetchProfitLossReport(
  storeId: string,
  from: string,
  to: string
): Promise<ProfitLossReport | null> {
  try {
    console.log('🔍 Fetching profit & loss report:', { storeId, from, to });

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
      console.error("❌ Profit & Loss report query error:", error);
      throw error;
    }

    console.log(`📊 P&L query summary:`, {
      recordCount,
      queryAttempts: queryAttempts.length,
      storeFilter: storeId !== "all" ? storeId.slice(0, 8) : "ALL_STORES"
    });

    // Log transaction details for debugging
    logTransactionDetails(transactions || [], "Profit & Loss Report");

    if (!transactions || transactions.length === 0) {
      console.info("ℹ️ No profit & loss data found for the selected period");
      return null;
    }

    // Fetch all products to get cost information
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, cost")
      .eq("store_id", storeId);

    if (productsError) {
      console.error("❌ Error fetching products:", productsError);
      throw productsError;
    }

    // Build a map of product IDs to their costs
    const productCostMap: Record<string, number> = {};
    products?.forEach(product => {
      productCostMap[product.id] = product.cost || 0;
    });

    console.log(`📦 Loaded ${Object.keys(productCostMap).length} product cost mappings`);

    // Calculate revenue, cost, and profit for each product
    const productProfitability: Record<string, {
      name: string;
      revenue: number;
      cost: number;
      profit: number;
      margin: number;
    }> = {};

    let totalRevenue = 0;
    let totalCost = 0;

    transactions.forEach(tx => {
      const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
      
      items.forEach((item: any) => {
        const productId = item.productId;
        const name = item.name;
        const quantity = item.quantity;
        const totalPrice = item.totalPrice;
        const cost = (productCostMap[productId] || 0) * quantity;
        
        if (!productProfitability[productId]) {
          productProfitability[productId] = {
            name,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0
          };
        }
        
        productProfitability[productId].revenue += totalPrice;
        productProfitability[productId].cost += cost;
        
        totalRevenue += totalPrice;
        totalCost += cost;
      });
    });

    // Calculate profit and margin for each product
    Object.keys(productProfitability).forEach(productId => {
      const product = productProfitability[productId];
      product.profit = product.revenue - product.cost;
      product.margin = product.revenue > 0 
        ? (product.profit / product.revenue) * 100 
        : 0;
    });

    console.log(`💰 P&L totals: Revenue ${formatCurrency(totalRevenue)}, Cost ${formatCurrency(totalCost)}, Gross Profit ${formatCurrency(totalRevenue - totalCost)}`);

    // Calculate daily profit and loss
    const dateRange = eachDayOfInterval({
      start: parseISO(from),
      end: parseISO(to)
    });

    const profitByDate = dateRange.map(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dailyTransactions = transactions.filter(tx => 
        tx.created_at.startsWith(dateStr)
      );
      
      let dailyRevenue = 0;
      let dailyCost = 0;
      
      dailyTransactions.forEach(tx => {
        const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
        
        items.forEach((item: any) => {
          dailyRevenue += item.totalPrice;
          dailyCost += (productCostMap[item.productId] || 0) * item.quantity;
        });
      });
      
      console.log(`📅 ${dateStr}: Revenue ${formatCurrency(dailyRevenue)}, Cost ${formatCurrency(dailyCost)}, Profit ${formatCurrency(dailyRevenue - dailyCost)}`);
      
      return {
        date: format(date, "MMM dd"),
        revenue: dailyRevenue,
        cost: dailyCost,
        profit: dailyRevenue - dailyCost
      };
    });

    // Fixed expenses (placeholder - in a real system this would come from an expenses table)
    const expenses = 5000; // Example fixed expenses
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - expenses;

    console.log(`📈 Final P&L: Gross Profit ${formatCurrency(grossProfit)}, Net Profit ${formatCurrency(netProfit)}`);

    return {
      totalRevenue,
      costOfGoods: totalCost,
      grossProfit,
      expenses,
      netProfit,
      profitByDate,
      productProfitability: Object.values(productProfitability)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10)
    };
  } catch (error) {
    console.error("❌ Error fetching profit/loss report:", error);
    toast.error("Failed to load profit and loss report");
    return null;
  }
}
