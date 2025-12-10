import { supabase } from "@/integrations/supabase/client";
import { BIRXReadingData } from "./enhancedXReadingReport";
import { fetchStoreInfo, handleReportError } from "../utils/reportUtils";
import { executeWithValidSession } from "@/contexts/auth/session-utils";
import { fetchTransactionsWithFallback } from "../utils/transactionQueryUtils";

// Helper function to get cashier name from user_id with session validation
async function getCashierName(userId: string): Promise<string> {
  return await executeWithValidSession(async () => {
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
  }, 'get cashier name');
}

// Helper function to find current or recent active shift with session validation
async function findActiveShift(storeId: string, date: string) {
  return await executeWithValidSession(async () => {
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
  }, 'find active shift');
}

// Fetch X-Reading data in the correct format for thermal printing
export async function fetchXReadingForThermal(
  storeId: string,
  date: string
): Promise<BIRXReadingData | null> {
  try {
    return await executeWithValidSession(async () => {
      // Get store information
      const storeData = await fetchStoreInfo(storeId);
      if (!storeData) {
        throw new Error("Store information not found");
      }

      // Get BIR store configuration
      const { data: birConfig } = await supabase
        .from("bir_store_config")
        .select("*")
        .eq("store_id", storeId)
        .single();

      // Find active or recent shift for the date
      const shiftData = await findActiveShift(storeId, date);

      // Use the same robust transaction query as the regular X-Reading
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

      // Get latest reset counter
      const { data: resetCounter } = await supabase
        .from("bir_reset_counters")
        .select("reset_counter")
        .eq("store_id", storeId)
        .single();

      // Get latest cumulative sales
      const { data: cumulativeSales } = await supabase
        .from("bir_cumulative_sales")
        .select("*")
        .eq("store_id", storeId)
        .single();

      // Generate reading number (simplified)
      const readingNumber = Date.now() % 10000;

      // Get cashier name if shift exists
      let cashierName = "No Active Shift";
      if (shiftData?.user_id) {
        cashierName = await getCashierName(shiftData.user_id);
      }

      // Helper to get non-empty string value
      const getValidString = (primary: string | null | undefined, ...fallbacks: (string | null | undefined)[]): string => {
        if (primary && primary.trim()) return primary;
        for (const fallback of fallbacks) {
          if (fallback && fallback.trim()) return fallback;
        }
        return 'Not Configured';
      };

      // If no transactions found, return zero data
      if (!transactions || transactions.length === 0) {
        return {
          // Business Info
          businessName: birConfig?.business_name || storeData?.name || 'Store',
          businessAddress: birConfig?.business_address || storeData?.address || '',
          taxpayerName: getValidString(birConfig?.taxpayer_name, storeData?.owner_name, storeData?.business_name),
          tin: getValidString(birConfig?.tin, storeData?.tin, storeData?.tax_id),
          
          // Machine Info
          machineId: birConfig?.machine_identification_number || 'MACHINE-001',
          serialNumber: birConfig?.machine_serial_number || 'SERIAL-001',
          posVersion: birConfig?.pos_version || '1.0',
          permitNumber: birConfig?.permit_number || '',
          
          // Reading Info
          readingNumber,
          resetCounter: resetCounter?.reset_counter || 0,
          readingDate: new Date(`${date}T23:59:59`),
          terminalId: 'TERMINAL-01',
          cashierName,
          
          // Transaction Range
          beginningReceiptNumber: '-',
          endingReceiptNumber: '-',
          transactionCount: 0,
          
          // Sales Data
          grossSales: 0,
          vatSales: 0,
          vatAmount: 0,
          vatExemptSales: 0,
          zeroRatedSales: 0,
          
          // Discounts
          scDiscount: 0,
          pwdDiscount: 0,
          naacDiscount: 0,
          spDiscount: 0,
          otherDiscounts: 0,
          totalDiscounts: 0,
          
          // Net Sales
          netSales: 0,
          
          // Accumulated Totals
          accumulatedGrossSales: cumulativeSales?.grand_total_sales || 0,
          accumulatedNetSales: cumulativeSales?.grand_total_sales || 0,
          accumulatedVat: 0,
        };
      }

      console.log(`📊 X-Reading Thermal found ${transactions.length} transactions for ${storeData.name} on ${date}`);

      // Calculate totals using BIR-compliant fields
      let grossSales = 0;
      let vatSales = 0;
      let vatAmount = 0;
      let vatExemptSales = 0;
      let zeroRatedSales = 0;
      let totalDiscounts = 0;
      let scDiscount = 0;
      let pwdDiscount = 0;
      let naacDiscount = 0;
      let spDiscount = 0;
      let otherDiscounts = 0;
      let netSales = 0;

      transactions.forEach(tx => {
        grossSales += tx.subtotal || 0;
        // Use BIR-specific fields if available
        vatSales += tx.vat_sales || (tx.subtotal - (tx.discount || 0));
        vatExemptSales += tx.vat_exempt_sales || 0;
        zeroRatedSales += tx.zero_rated_sales || 0;
        vatAmount += tx.tax || 0;
        totalDiscounts += tx.discount || 0;
        netSales += tx.total || 0;
        
        // Count different discount types using BIR fields
        if (tx.discount_type === 'senior') {
          scDiscount += tx.senior_citizen_discount || tx.discount || 0;
        } else if (tx.discount_type === 'pwd') {
          pwdDiscount += tx.pwd_discount || tx.discount || 0;
        } else if (tx.discount_type === 'naac') {
          naacDiscount += tx.discount || 0;
        } else if (tx.discount_type === 'employee') {
          spDiscount += tx.discount || 0;
        } else if (tx.discount && tx.discount > 0) {
          otherDiscounts += tx.discount;
        }
      });

      // Get receipt numbers
      const receiptNumbers = transactions.map(tx => tx.receipt_number).filter(Boolean).sort();
      const beginningReceiptNumber = receiptNumbers[0] || '-';
      const endingReceiptNumber = receiptNumbers[receiptNumbers.length - 1] || '-';

      return {
        // Business Info
        businessName: birConfig?.business_name || storeData?.name || 'Store',
        businessAddress: birConfig?.business_address || storeData?.address || '',
        taxpayerName: getValidString(birConfig?.taxpayer_name, storeData?.owner_name, storeData?.business_name),
        tin: getValidString(birConfig?.tin, storeData?.tin, storeData?.tax_id),
        
        // Machine Info
        machineId: birConfig?.machine_identification_number || storeData?.machine_serial_number || 'MACHINE-001',
        serialNumber: birConfig?.machine_serial_number || storeData?.machine_serial_number || 'SERIAL-001',
        posVersion: birConfig?.pos_version || '1.0',
        permitNumber: birConfig?.permit_number || '',
        
        // Reading Info
        readingNumber,
        resetCounter: resetCounter?.reset_counter || 0,
        readingDate: new Date(`${date}T23:59:59`),
        terminalId: storeData?.machine_serial_number || 'TERMINAL-01',
        cashierName,
        
        // Transaction Range
        beginningReceiptNumber,
        endingReceiptNumber,
        transactionCount: transactions.length,
        
        // Sales Data
        grossSales,
        vatSales,
        vatAmount,
        vatExemptSales,
        zeroRatedSales,
        
        // Discounts
        scDiscount,
        pwdDiscount,
        naacDiscount,
        spDiscount,
        otherDiscounts,
        totalDiscounts,
        
        // Net Sales
        netSales,
        
        // Accumulated Totals
        accumulatedGrossSales: (cumulativeSales?.grand_total_sales || 0) + grossSales,
        accumulatedNetSales: (cumulativeSales?.grand_total_sales || 0) + netSales,
        accumulatedVat: vatAmount,
      };
    }, 'X-Reading thermal generation');
  } catch (error) {
    return handleReportError("X-Reading Thermal", error);
  }
}
