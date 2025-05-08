
import { supabase } from "@/integrations/supabase/client";
import { VATReport } from "@/types/reports";
import { createSampleVATReport, handleReportError } from "../utils/reportUtils";

// VAT Report
export async function fetchVATReport(
  storeId: string,
  from: string,
  to: string
): Promise<VATReport | null> {
  try {
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
      // For demo purposes, return sample data
      return createSampleVATReport(from, to);
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

    return {
      transactions: vatTransactions,
      totals
    };
  } catch (error) {
    return handleReportError("VAT Report", error);
  }
}
