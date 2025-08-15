
import { supabase } from "@/integrations/supabase/client";
import { XReadingReport } from "@/types/reports";
import { fetchStoreInfo, handleReportError } from "../utils/reportUtils";
import { fetchTransactionsWithFallback } from "../utils/transactionQueryUtils";
import { toast } from "sonner";

// Helper function to get cashier name from user_id
async function getCashierName(userId: string): Promise<string> {
  try {
    const { data: appUser } = await supabase
      .from('app_users')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (appUser) {
      return `${appUser.first_name} ${appUser.last_name}`;
    }
    
    return "Unknown Cashier";
  } catch (error) {
    console.error('Error fetching cashier name:', error);
    return "Unknown Cashier";
  }
}

// Helper function to find current or recent active shift
async function findActiveShift(storeId: string, date: string) {
  const startOfDay = new Date(date + "T00:00:00.000Z");
  const endOfDay = new Date(date + "T23:59:59.999Z");
  
  // First try to find an active shift for today
  const { data: activeShift } = await supabase
    .from("shifts")
    .select("id, user_id, start_time, starting_cash, status")
    .eq("store_id", storeId)
    .eq("status", "active")
    .gte("start_time", startOfDay.toISOString())
    .lte("start_time", endOfDay.toISOString())
    .maybeSingle();
  
  if (activeShift) {
    return activeShift;
  }
  
  // If no active shift, try to find the most recent shift for the date
  const { data: recentShift } = await supabase
    .from("shifts")
    .select("id, user_id, start_time, starting_cash, status")
    .eq("store_id", storeId)
    .gte("start_time", startOfDay.toISOString())
    .lte("start_time", endOfDay.toISOString())
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();
    
  return recentShift;
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
    
    // Find active or recent shift for the date
    const shiftData = await findActiveShift(storeId, date);

    // Use the same robust transaction query as the Sales Report
    const queryResult = await fetchTransactionsWithFallback({
      storeId,
      from: date,
      to: date,
      status: "completed",
      orderBy: "created_at",
      ascending: true
    });

    const { data: transactions, error: txError } = queryResult;
    
    if (txError) throw txError;
    
    // Get cashier name if shift exists
    let cashierName = "No Active Shift";
    if (shiftData?.user_id) {
      cashierName = await getCashierName(shiftData.user_id);
    }
    
    // If no transactions found, return actual zero data instead of sample data
    if (!transactions || transactions.length === 0) {
      console.log('No transactions found for X-Reading, returning zero data');
      return {
        storeName: storeData.business_name || storeData.name,
        storeAddress: storeData.address,
        contactInfo: storeData.phone || storeData.email,
        taxId: storeData.tin || storeData.tax_id,
        cashierName,
        terminal: storeData.machine_serial_number || 'TERMINAL-01',
        beginningReceiptNumber: '-',
        endingReceiptNumber: '-',
        transactionCount: 0,
        grossSales: 0,
        vatableSales: 0,
        vatExemptSales: 0,
        vatZeroRatedSales: 0,
        totalDiscounts: 0,
        seniorDiscount: 0,
        pwdDiscount: 0,
        employeeDiscount: 0,
        otherDiscounts: 0,
        netSales: 0,
        vatAmount: 0,
        vatExempt: 0,
        vatZeroRated: 0,
        cashPayments: 0,
        cardPayments: 0,
        eWalletPayments: 0,
        totalPayments: 0
      };
    }
    
    console.log(`📊 X-Reading found ${transactions.length} transactions for ${storeData.name} on ${date}`);
    console.log('Transaction IDs:', transactions.map(t => ({ id: t.id, receipt: t.receipt_number, total: t.total })));
    
    // Cashier name was already fetched above
    
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
      terminal: storeData.machine_serial_number || storeData.machine_accreditation_number || 'TERMINAL-01',
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
    console.error("❌ X-Reading generation error:", error);
    
    // Return a basic structure even on error, with error indication
    try {
      const storeData = await fetchStoreInfo(storeId);
      return {
        storeName: storeData?.business_name || storeData?.name || 'Unknown Store',
        storeAddress: storeData?.address || 'Unknown Address',
        contactInfo: storeData?.phone || storeData?.email || 'No Contact Info',
        taxId: storeData?.tin || storeData?.tax_id || 'No TIN',
        cashierName: "Error: Unable to determine cashier",
        terminal: storeData?.machine_serial_number || 'TERMINAL-01',
        beginningReceiptNumber: '-',
        endingReceiptNumber: '-',
        transactionCount: 0,
        grossSales: 0,
        vatableSales: 0,
        vatExemptSales: 0,
        vatZeroRatedSales: 0,
        totalDiscounts: 0,
        seniorDiscount: 0,
        pwdDiscount: 0,
        employeeDiscount: 0,
        otherDiscounts: 0,
        netSales: 0,
        vatAmount: 0,
        vatExempt: 0,
        vatZeroRated: 0,
        cashPayments: 0,
        cardPayments: 0,
        eWalletPayments: 0,
        totalPayments: 0
      };
    } catch (fallbackError) {
      console.error("❌ X-Reading fallback error:", fallbackError);
      toast.error("Failed to generate X-Reading report");
      return null;
    }
  }
}
