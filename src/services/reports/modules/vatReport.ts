import { supabase } from "@/integrations/supabase/client";
import { VATReport } from "@/types/reports";
import { handleReportError } from "../utils/reportUtils";
import { createReportResponse, ReportWithDataSource } from "../utils/dataSourceUtils";

// VAT Report
export async function fetchVATReport(
  storeId: string,
  from: string,
  to: string,
  useSampleData = false
): Promise<ReportWithDataSource<VATReport> | null> {
  try {
    if (useSampleData) {
      const sampleData = createSampleVATReport(from, to);
      return createReportResponse(sampleData, 'sample', {
        fallbackReason: 'Explicitly requested sample data'
      });
    }

    // Get all transactions for the date range
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at");
    
    if (txError) throw txError;
    
    if (!transactions || transactions.length === 0) {
      // Return empty result instead of sample data
      const emptyReport: VATReport = {
        transactions: [],
        totals: {
          vatableSales: 0,
          vatAmount: 0,
          vatExemptSales: 0,
          vatZeroRatedSales: 0
        }
      };
      
      return createReportResponse(emptyReport, 'real', {
        fallbackReason: 'No transactions found for date range',
        recordCount: 0
      });
    }
    
    // Process transactions for VAT reporting
    const vatTransactions = transactions.map(tx => {
      // Apply simple VAT calculation
      const vatableSales = tx.subtotal - (tx.discount || 0);
      const vatAmount = tx.tax;
      const vatExemptSales = 0; // In a real system, would extract from items with VAT exemption
      const vatZeroRatedSales = 0; // In a real system, would extract from items with zero VAT rate
      
      return {
        date: tx.created_at,
        receiptNumber: tx.receipt_number,
        transactionType: tx.payment_method === 'cash' ? 'CASH SALES' : 'NON-CASH SALES',
        vatableSales,
        vatAmount,
        vatExemptSales,
        vatZeroRatedSales
      };
    });
    
    // Calculate totals
    const totals = vatTransactions.reduce(
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

    const vatReport: VATReport = {
      transactions: vatTransactions,
      totals
    };
    
    return createReportResponse(vatReport, 'real', {
      recordCount: transactions.length
    });
  } catch (error) {
    return handleReportError("VAT Report", error);
  }
}

// Helper function for sample data (moved from reportUtils)
function createSampleVATReport(from: string, to: string): VATReport {
  // Generate sample transactions for each day in the date range
  const transactions = [];
  const fromDate = new Date(from);
  const toDate = new Date(to);
  let currentDate = fromDate;
  
  let receiptCounter = 1;
  
  while (currentDate <= toDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    // Create 4-6 transactions for each day
    const txCount = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < txCount; i++) {
      const vatableSales = 1000 + Math.random() * 5000;
      const vatAmount = vatableSales * 0.12;
      
      transactions.push({
        date: dateStr,
        receiptNumber: `R-${format(currentDate, 'yyyyMMdd')}-${String(receiptCounter).padStart(4, '0')}`,
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
