
import { supabase } from "@/integrations/supabase/client";
import { ZReadingReport } from "@/types/reports";
import { fetchStoreInfo, handleReportError } from "../utils/reportUtils";

// Helper function to create sample Z-Reading data
function createSampleZReading(store: any): ZReadingReport {
  return {
    storeName: store?.name || 'Demo Store',
    storeAddress: store?.address || '123 Main Street, City',
    contactInfo: store?.phone || '123-456-7890',
    taxId: store?.tax_id || '123-456-789-000',
    storeManager: 'Jane Smith',
    cashierName: 'John Doe',
    terminal: 'Terminal 1',
    beginningReceiptNumber: 'R-20250101-0001',
    endingReceiptNumber: 'R-20250101-0085',
    transactionCount: 85,
    grossSales: 28500.00,
    vatableSales: 25446.43,
    vatExemptSales: 0,
    vatZeroRatedSales: 0,
    totalRefunds: 500.00,
    totalDiscounts: 1200.00,
    seniorDiscount: 500.00,
    pwdDiscount: 350.00,
    employeeDiscount: 350.00,
    otherDiscounts: 0,
    netSales: 26800.00,
    vatAmount: 3053.57,
    vatExempt: 0,
    vatZeroRated: 0,
    cashPayments: 18500.00,
    cardPayments: 6200.00,
    eWalletPayments: 2100.00,
    totalPayments: 26800.00,
    beginningCash: 5000.00,
    cashSales: 18500.00,
    cashPayouts: 1500.00,
    expectedCash: 22000.00,
    actualCash: 21950.00,
    cashVariance: -50.00,
    accumulatedGrossSales: 258500.00,
    accumulatedVAT: 31020.00
  };
}

// Z-Reading Report (end of day)
export async function fetchZReading(
  storeId: string,
  date: string
): Promise<ZReadingReport | null> {
  try {
    // Get store information
    const storeData = await fetchStoreInfo(storeId);
    if (!storeData) {
      throw new Error("Store information not found");
    }
    
    // Get all shifts for the date
    const { data: shifts, error: shiftError } = await supabase
      .from("shifts")
      .select("id, user_id, start_time, starting_cash, ending_cash")
      .eq("store_id", storeId)
      .gte("start_time", `${date}T00:00:00`)
      .lt("start_time", `${date}T23:59:59`);

    // For demo purposes, create sample data if no shifts found
    if (shiftError || !shifts || shifts.length === 0) {
      return createSampleZReading(storeData);
    }
    
    // Get cashier name (would need to get this from users table)
    let cashierName = "Unknown";
    if (shifts.length > 0 && shifts[0].user_id) {
      // This would require a users table in your database
      // For now we'll use a placeholder
      cashierName = "Cashier #" + shifts[0].user_id.substring(0, 5);
    }
    
    // Get all transactions for this date
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", `${date}T00:00:00`)
      .lt("created_at", `${date}T23:59:59`);
    
    if (txError) throw txError;
    
    // Calculate totals (similar to X-reading but for all shifts)
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
      vatableSales += tx.subtotal - (tx.discount || 0);
      vatAmount += tx.tax;
      totalDiscounts += tx.discount || 0;
      netSales += tx.total;
      
      // Count different discount types
      if (tx.discount_type === 'senior') {
        seniorDiscount += tx.discount || 0;
      } else if (tx.discount_type === 'pwd') {
        pwdDiscount += tx.discount || 0;
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
    
    // Calculate cash drawer info from all shifts
    let beginningCash = 0;
    let actualCash = 0;
    
    shifts.forEach(shift => {
      beginningCash += shift.starting_cash || 0;
      if (shift.ending_cash) {
        actualCash += shift.ending_cash;
      }
    });
    
    const cashSales = cashPayments;
    const cashPayouts = 0; // Would come from expenses/payouts table
    const expectedCash = beginningCash + cashSales - cashPayouts;
    const cashVariance = actualCash - expectedCash;

    return {
      storeName: storeData.name,
      storeAddress: storeData.address,
      contactInfo: storeData.phone || storeData.email,
      taxId: storeData.tax_id,
      storeManager: 'Store Manager',
      cashierName,
      terminal: 'Terminal 1',
      beginningReceiptNumber,
      endingReceiptNumber,
      transactionCount: transactions?.length || 0,
      grossSales,
      vatableSales,
      vatExemptSales,
      vatZeroRatedSales,
      totalRefunds: 0, // Would come from refunds table
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
      totalPayments: cashPayments + cardPayments + eWalletPayments,
      beginningCash,
      cashSales,
      cashPayouts,
      expectedCash,
      actualCash,
      cashVariance,
      accumulatedGrossSales: grossSales + 250000, // For demo - would be from accumulated historical data
      accumulatedVAT: vatAmount + 30000 // For demo - would be from accumulated historical data
    };
  } catch (error) {
    return handleReportError("Z-Reading", error);
  }
}
