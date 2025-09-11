
import { toast } from "sonner";
import { formatInPhilippinesTime, PHILIPPINES_TIMEZONE } from "@/utils/timezone";
import { supabase } from "@/integrations/supabase/client";

// Utility function to get store information
export async function fetchStoreInfo(storeId: string) {
  try {
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (storeError) throw storeError;
    return storeData;
  } catch (error) {
    console.error("Error fetching store info:", error);
    return null;
  }
}

// Helper function to handle API errors
export function handleReportError(reportType: string, error: any): null {
  console.error(`Error fetching ${reportType}:`, error);
  toast.error(`Failed to generate ${reportType} report`);
  return null;
}

// Create sample data for demo purposes when needed
export function createSampleVATReport(from: string, to: string) {
  // Generate sample transactions for each day in the date range
  const transactions = [];
  const fromDate = new Date(from);
  const toDate = new Date(to);
  let currentDate = fromDate;
  
  let receiptCounter = 1;
  
  while (currentDate <= toDate) {
    const dateStr = formatInPhilippinesTime(currentDate, 'yyyy-MM-dd');
    
    // Create 4-6 transactions for each day
    const txCount = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < txCount; i++) {
      const vatableSales = 1000 + Math.random() * 5000;
      const vatAmount = vatableSales * 0.12;
      
      transactions.push({
        date: dateStr,
        receiptNumber: `R-${formatInPhilippinesTime(currentDate, 'yyyyMMdd')}-${String(receiptCounter).padStart(4, '0')}`,
        transactionType: Math.random() > 0.7 ? 'NON-CASH SALES' : 'CASH SALES',
        vatableSales,
        vatAmount,
        vatExemptSales: Math.random() > 0.8 ? Math.random() * 1000 : 0,
        vatZeroRatedSales: Math.random() > 0.9 ? Math.random() * 500 : 0,
      });
      
      receiptCounter++;
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Calculate totals
  const totals = transactions.reduce(
    (acc, tx) => {
      return {
        vatableSales: acc.vatableSales + tx.vatableSales,
        vatAmount: acc.vatAmount + tx.vatAmount,
        vatExemptSales: acc.vatExemptSales + tx.vatExemptSales,
        vatZeroRatedSales: acc.vatZeroRatedSales + tx.vatZeroRatedSales
      };
    },
    { vatableSales: 0, vatAmount: 0, vatExemptSales: 0, vatZeroRatedSales: 0 }
  );

  return {
    transactions,
    totals
  };
}

export function createSampleDailySummary() {
  return {
    totalSales: 26800.00,
    transactionCount: 85,
    totalItemsSold: 210,
    items: [
      { name: 'Iced Coffee', quantity: 45, price: 120.00, totalSales: 5400.00 },
      { name: 'Latte', quantity: 38, price: 140.00, totalSales: 5320.00 },
      { name: 'Croissant', quantity: 52, price: 95.00, totalSales: 4940.00 },
      { name: 'Chocolate Cake', quantity: 25, price: 180.00, totalSales: 4500.00 },
      { name: 'Sandwich', quantity: 32, price: 160.00, totalSales: 5120.00 },
      { name: 'Fruit Smoothie', quantity: 18, price: 150.00, totalSales: 2700.00 }
    ],
    paymentMethods: [
      { method: 'Cash', amount: 18500.00, percentage: 69.0 },
      { method: 'Card', amount: 6200.00, percentage: 23.1 },
      { method: 'E-Wallet', amount: 2100.00, percentage: 7.9 }
    ]
  };
}
