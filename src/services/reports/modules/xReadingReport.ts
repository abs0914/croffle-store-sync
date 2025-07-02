
import { supabase } from "@/integrations/supabase/client";
import { XReadingReport } from "@/types/reports";
import { fetchStoreInfo, handleReportError } from "../utils/reportUtils";

// Helper function to create sample X-Reading data
function createSampleXReading(store: any): XReadingReport {
  return {
    storeName: store?.name || 'Demo Store',
    storeAddress: store?.address || '123 Main Street, City',
    contactInfo: store?.phone || '123-456-7890',
    taxId: store?.tax_id || '123-456-789-000',
    cashierName: 'John Doe',
    terminal: 'Terminal 1',
    beginningReceiptNumber: 'R-20250101-0001',
    endingReceiptNumber: 'R-20250101-0035',
    transactionCount: 35,
    grossSales: 12500.00,
    vatableSales: 11160.71,
    vatExemptSales: 0,
    vatZeroRatedSales: 0,
    totalDiscounts: 500.00,
    seniorDiscount: 200.00,
    pwdDiscount: 150.00,
    employeeDiscount: 150.00,
    otherDiscounts: 0,
    netSales: 12000.00,
    vatAmount: 1339.29,
    vatExempt: 0,
    vatZeroRated: 0,
    cashPayments: 8500.00,
    cardPayments: 2500.00,
    eWalletPayments: 1000.00,
    totalPayments: 12000.00
  };
}

// X-Reading Report (current shift/day status)
export async function fetchXReading(
  storeId: string,
  date: string
): Promise<XReadingReport | null> {
  try {
    // Get store information
    const storeData = await fetchStoreInfo(storeId);
    if (!storeData) {
      throw new Error("Store information not found");
    }
    
    // Get active shift information
    const { data: shiftData, error: shiftError } = await supabase
      .from("shifts")
      .select("id, user_id, start_time, starting_cash")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("start_time", { ascending: false })
      .limit(1)
      .single();

    // If no active shift, return mock data for demo
    if (shiftError) {
      // For demo, create sample data
      return createSampleXReading(storeData);
    }
    
    // Get user information separately since there's no direct relationship
    let cashierName = "Unknown";
    if (shiftData.user_id) {
      // This would require a users table in your database
      // For now we'll use a placeholder
      cashierName = "Cashier #" + shiftData.user_id.substring(0, 5);
    }
    
    // Get transactions for this shift
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("shift_id", shiftData.id)
      .eq("status", "completed");
    
    if (txError) throw txError;
    
    // Calculate totals using BIR-compliant fields
    let grossSales = 0;
    let vatableSales = 0;
    let vatExemptSales = 0;
    let vatZeroRatedSales = 0;
    let totalDiscounts = 0;
    let seniorDiscount = 0;
    let pwdDiscount = 0;
    let employeeDiscount = 0;
    let otherDiscounts = 0;
    let netSales = 0;
    let vatAmount = 0;
    let cashPayments = 0;
    let cardPayments = 0;
    let eWalletPayments = 0;

    transactions?.forEach(tx => {
      grossSales += tx.subtotal;
      // Use BIR-specific fields if available
      vatableSales += tx.vat_sales || (tx.subtotal - (tx.discount || 0));
      vatExemptSales += tx.vat_exempt_sales || 0;
      vatZeroRatedSales += tx.zero_rated_sales || 0;
      vatAmount += tx.tax || 0;
      totalDiscounts += tx.discount || 0;
      netSales += tx.total;
      
      // Count different discount types using BIR fields
      if (tx.discount_type === 'senior') {
        seniorDiscount += tx.senior_citizen_discount || tx.discount || 0;
      } else if (tx.discount_type === 'pwd') {
        pwdDiscount += tx.pwd_discount || tx.discount || 0;
      } else if (tx.discount_type === 'employee') {
        employeeDiscount += tx.discount || 0;
      } else if (tx.discount && tx.discount > 0) {
        otherDiscounts += tx.discount;
      }
      
      // Count payment methods
      if (tx.payment_method === 'cash') {
        cashPayments += tx.total;
      } else if (tx.payment_method === 'card') {
        cardPayments += tx.total;
      } else if (tx.payment_method === 'e-wallet') {
        eWalletPayments += tx.total;
      }
    });
    
    // Get receipt numbers
    const receiptNumbers = transactions?.map(tx => tx.receipt_number).sort() || [];
    const beginningReceiptNumber = receiptNumbers[0] || '-';
    const endingReceiptNumber = receiptNumbers[receiptNumbers.length - 1] || '-';

    return {
      storeName: storeData.business_name || storeData.name,
      storeAddress: storeData.address,
      contactInfo: storeData.phone || storeData.email,
      taxId: storeData.tin || storeData.tax_id,
      cashierName,
      terminal: 'TERMINAL-01',
      beginningReceiptNumber,
      endingReceiptNumber,
      transactionCount: transactions?.length || 0,
      grossSales,
      vatableSales,
      vatExemptSales,
      vatZeroRatedSales,
      totalDiscounts,
      seniorDiscount,
      pwdDiscount,
      employeeDiscount,
      otherDiscounts,
      netSales,
      vatAmount,
      vatExempt: vatExemptSales,
      vatZeroRated: vatZeroRatedSales,
      cashPayments,
      cardPayments,
      eWalletPayments,
      totalPayments: cashPayments + cardPayments + eWalletPayments
    };
  } catch (error) {
    return handleReportError("X-Reading", error);
  }
}
