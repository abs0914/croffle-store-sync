import { supabase } from "@/integrations/supabase/client";
import { BIRZReadingData } from "./enhancedZReadingReport";
import { fetchStoreInfo, handleReportError } from "../utils/reportUtils";
import { executeWithValidSession } from "@/contexts/auth/session-utils";

// Fetch Z-Reading data in the correct format for thermal printing
export async function fetchZReadingForThermal(
  storeId: string,
  date: string
): Promise<BIRZReadingData | null> {
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

      // Get all shifts for the date
      const { data: shifts } = await supabase
        .from("shifts")
        .select("*")
        .eq("store_id", storeId)
        .gte("start_time", `${date}T00:00:00`)
        .lt("start_time", `${date}T23:59:59`);

      // Get all transactions for this date
      const startTime = `${date}T00:00:00.000Z`;
      const endTime = `${date}T23:59:59.999Z`;
      
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("store_id", storeId)
        .eq("status", "completed")
        .gte("created_at", startTime)
        .lte("created_at", endTime);
      
      if (txError) {
        console.error("❌ Z-Reading transaction query error:", txError);
        throw txError;
      }

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

      // If no transactions found, return zero data
      if (!transactions || transactions.length === 0) {
        return {
          // Business Info
          businessName: birConfig?.business_name || storeData?.name || 'Store',
          businessAddress: birConfig?.business_address || storeData?.address || '',
          tin: birConfig?.tin || storeData?.tax_id || '',
          taxpayerName: birConfig?.taxpayer_name || 'Store Owner',
          
          // Machine Info
          machineId: birConfig?.machine_identification_number || 'MACHINE-001',
          serialNumber: birConfig?.machine_serial_number || 'SERIAL-001',
          posVersion: birConfig?.pos_version || '1.0',
          permitNumber: birConfig?.permit_number || '',
          terminalId: 'TERMINAL-01',
          
          // Reading Info
          readingNumber,
          readingDate: new Date(`${date}T23:59:59`),
          cashierName: 'No Cashier',
          managerName: 'No Manager',
          resetCounter: resetCounter?.reset_counter || 0,
          
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
          netSales: 0,
          
          // Discounts
          totalDiscounts: 0,
          scDiscount: 0,
          pwdDiscount: 0,
          naacDiscount: 0,
          spDiscount: 0,
          otherDiscounts: 0,
          
          // Cash Info
          beginningCash: 0,
          cashSales: 0,
          cashPayouts: 0,
          expectedCash: 0,
          actualCash: 0,
          cashVariance: 0,
          totalRefunds: 0,
          
          // Accumulated Totals
          accumulatedGrossSales: cumulativeSales?.grand_total_sales || 0,
          accumulatedNetSales: cumulativeSales?.grand_total_sales || 0,
          accumulatedVat: 0,
        };
      }

      // Calculate totals from transactions
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
      let cashSales = 0;
      
      // Order type and payment method breakdowns
      let dineInSales = 0;
      let grabFoodSales = 0;
      let foodPandaSales = 0;
      let cardSales = 0;
      let ewalletSales = 0;

      transactions.forEach(tx => {
        grossSales += tx.subtotal || 0;
        vatSales += (tx.subtotal || 0) - (tx.discount || 0);
        vatAmount += tx.tax || 0;
        totalDiscounts += tx.discount || 0;
        netSales += tx.total || 0;
        
        // Count different discount types
        if (tx.discount_type === 'senior') {
          scDiscount += tx.discount || 0;
        } else if (tx.discount_type === 'pwd') {
          pwdDiscount += tx.discount || 0;
        } else if (tx.discount_type === 'naac') {
          naacDiscount += tx.discount || 0;
        } else if (tx.discount_type === 'employee') {
          spDiscount += tx.discount || 0;
        } else if (tx.discount && tx.discount > 0) {
          otherDiscounts += tx.discount;
        }
        
        // Count order types (handle all variations)
        const orderType = (tx.order_type || 'dine_in').toLowerCase();
        if (orderType === 'dine_in') {
          dineInSales += tx.total || 0;
        } else if (orderType === 'grab_food' || orderType === 'grabfood') {
          grabFoodSales += tx.total || 0;
        } else if (orderType === 'food_panda' || orderType === 'foodpanda' || orderType === 'online_delivery') {
          foodPandaSales += tx.total || 0;
        }
        
        // Count payment methods (handle all variations including hyphenated)
        const paymentMethod = (tx.payment_method || 'cash').toLowerCase().replace(/[-_\s]/g, '');
        if (paymentMethod === 'cash') {
          cashSales += tx.total || 0;
        } else if (paymentMethod === 'card' || paymentMethod === 'creditcard' || paymentMethod === 'debitcard') {
          cardSales += tx.total || 0;
        } else if (paymentMethod === 'ewallet' || paymentMethod === 'gcash' || paymentMethod === 'paymaya') {
          ewalletSales += tx.total || 0;
        }
      });

      // Get receipt numbers
      const receiptNumbers = transactions.map(tx => tx.receipt_number).filter(Boolean).sort();
      const beginningReceiptNumber = receiptNumbers[0] || '-';
      const endingReceiptNumber = receiptNumbers[receiptNumbers.length - 1] || '-';

      // Calculate cash drawer info
      let beginningCash = 0;
      let actualCash = 0;
      
      shifts?.forEach(shift => {
        beginningCash += shift.starting_cash || 0;
        if (shift.ending_cash) {
          actualCash += shift.ending_cash;
        }
      });

      const cashPayouts = 0; // Would come from expenses
      const expectedCash = beginningCash + cashSales - cashPayouts;
      const cashVariance = actualCash - expectedCash;

      return {
        // Business Info
        businessName: birConfig?.business_name || storeData?.name || 'Store',
        businessAddress: birConfig?.business_address || storeData?.address || '',
        tin: birConfig?.tin || storeData?.tax_id || '',
        taxpayerName: birConfig?.taxpayer_name || 'Store Owner',
        
        // Machine Info
        machineId: birConfig?.machine_identification_number || 'MACHINE-001',
        serialNumber: birConfig?.machine_serial_number || 'SERIAL-001',
        posVersion: birConfig?.pos_version || '1.0',
        permitNumber: birConfig?.permit_number || '',
        terminalId: 'TERMINAL-01',
        
        // Reading Info
        readingNumber,
        readingDate: new Date(`${date}T23:59:59`),
        cashierName: shifts?.[0] ? `Cashier #${shifts[0].user_id?.substring(0, 5)}` : 'No Cashier',
        managerName: 'Store Manager',
        resetCounter: resetCounter?.reset_counter || 0,
        
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
        netSales,
        
        // Discounts
        totalDiscounts,
        scDiscount,
        pwdDiscount,
        naacDiscount,
        spDiscount,
        otherDiscounts,
        
        // Order Type Breakdown
        orderTypeBreakdown: {
          dineIn: dineInSales,
          grabFood: grabFoodSales,
          foodPanda: foodPandaSales,
        },
        
        // Payment Method Breakdown
        paymentMethodBreakdown: {
          cash: cashSales,
          card: cardSales,
          ewallet: ewalletSales,
        },
        
        // Cash Info
        beginningCash,
        cashSales,
        cashPayouts,
        expectedCash,
        actualCash,
        cashVariance,
        totalRefunds: 0, // Would come from void_transactions
        
        // Accumulated Totals
        accumulatedGrossSales: (cumulativeSales?.grand_total_sales || 0) + grossSales,
        accumulatedNetSales: (cumulativeSales?.grand_total_sales || 0) + netSales,
        accumulatedVat: vatAmount,
      };
    }, 'Z-Reading thermal generation');
  } catch (error) {
    return handleReportError("Z-Reading Thermal", error);
  }
}