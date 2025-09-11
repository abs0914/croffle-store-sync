
import { supabase } from "@/integrations/supabase/client";
import { DailySalesSummary } from "@/types/reports";
import { createSampleDailySummary, handleReportError } from "../utils/reportUtils";
import { getDateRangeInPhilippines } from "@/utils/timezone";

// Daily Sales Summary
export async function fetchDailySalesSummary(
  storeId: string,
  date: string
): Promise<DailySalesSummary | null> {
  try {
    // Get date range in Philippines timezone and convert to UTC for database query
    const dateRange = getDateRangeInPhilippines(date);
    
    // Get all transactions for this date using proper timezone conversion
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", dateRange.from)
      .lt("created_at", dateRange.to);
    
    if (txError) throw txError;
    
    if (!transactions || transactions.length === 0) {
      // For demo purposes, return sample data
      return createSampleDailySummary();
    }
    
    // Calculate sales by item
    const itemSales: Record<string, { 
      name: string, 
      quantity: number, 
      price: number,
      totalSales: number 
    }> = {};
    
    let totalItemsSold = 0;
    let totalSales = 0;
    
    transactions.forEach(tx => {
      totalSales += tx.total;
      
      const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
      
      items.forEach((item: any) => {
        const itemName = item.name;
        const quantity = item.quantity;
        const unitPrice = item.unitPrice;
        const totalPrice = item.totalPrice;
        
        if (!itemSales[itemName]) {
          itemSales[itemName] = {
            name: itemName,
            quantity: 0,
            price: unitPrice,
            totalSales: 0
          };
        }
        
        itemSales[itemName].quantity += quantity;
        itemSales[itemName].totalSales += totalPrice;
        totalItemsSold += quantity;
      });
    });
    
    // Calculate payment methods
    const paymentMethods: Record<string, number> = {};
    
    transactions.forEach(tx => {
      const method = tx.payment_method;
      if (!paymentMethods[method]) {
        paymentMethods[method] = 0;
      }
      paymentMethods[method] += tx.total;
    });
    
    const paymentMethodsArray = Object.entries(paymentMethods)
      .map(([method, amount]) => ({
        method: method === 'cash' ? 'Cash' : 
                method === 'card' ? 'Card' : 
                method === 'e-wallet' ? 'E-Wallet' : method,
        amount,
        percentage: (amount / totalSales) * 100
      }));

    return {
      totalSales,
      transactionCount: transactions.length,
      totalItemsSold,
      items: Object.values(itemSales).sort((a, b) => b.totalSales - a.totalSales),
      paymentMethods: paymentMethodsArray
    };
  } catch (error) {
    return handleReportError("Daily Sales Summary", error);
  }
}
