import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface BIRXReadingData {
  // Store & Machine Info
  businessName: string;
  businessAddress: string;
  taxpayerName: string;
  tin: string;
  machineId: string; // MIN
  serialNumber: string; // S/N
  posVersion: string;
  permitNumber?: string;
  
  // Reading Info
  readingNumber: number;
  resetCounter: number;
  readingDate: Date;
  terminalId: string;
  cashierName: string;
  
  // Transaction Range
  beginningReceiptNumber: string;
  endingReceiptNumber: string;
  transactionCount: number;
  
  // Sales Breakdown
  grossSales: number;
  vatSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  
  // Discounts
  scDiscount: number; // Senior Citizen
  pwdDiscount: number; // PWD
  naacDiscount: number; // NAAC
  spDiscount: number; // Solo Parent
  otherDiscounts: number;
  totalDiscounts: number;
  
  // Net Sales
  netSales: number;
  
  // Accumulated Totals
  accumulatedGrossSales: number;
  accumulatedNetSales: number;
  accumulatedVat: number;
}

export async function generateBIRXReading(storeId: string, shiftId?: string): Promise<BIRXReadingData> {
  try {
    // Get BIR store configuration
    const { data: birConfig } = await supabase
      .from('bir_store_config')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (!birConfig) {
      throw new Error('BIR configuration not found for store');
    }

    // Get current reset counter
    const { data: resetCounter } = await supabase
      .from('bir_reset_counters')
      .select('*')
      .eq('store_id', storeId)
      .single();

    // Get shift information if provided
    let shiftData = null;
    let cashierName = 'System User';
    
    if (shiftId) {
      const { data: shift } = await supabase
        .from('shifts')
        .select(`
          *,
          cashiers (
            first_name,
            last_name
          )
        `)
        .eq('id', shiftId)
        .single();
      
      if (shift) {
        shiftData = shift;
        cashierName = shift.cashiers 
          ? `${shift.cashiers.first_name} ${shift.cashiers.last_name}`
          : 'Unknown Cashier';
      }
    }

    // Get current date range for transactions
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    
    // Fetch today's transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${currentDate}T00:00:00`)
      .lt('created_at', `${currentDate}T23:59:59`)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    // Calculate sales data
    const salesData = calculateSalesData(transactions || []);
    
    // Get receipt number range
    const receiptRange = getReceiptRange(transactions || []);
    
    // Get next reading number
    const { data: lastReading } = await supabase
      .from('bir_readings')
      .select('reading_number')
      .eq('store_id', storeId)
      .eq('reading_type', 'X')
      .order('reading_number', { ascending: false })
      .limit(1)
      .single();

    const nextReadingNumber = (lastReading?.reading_number || 0) + 1;

    // Get accumulated totals
    const accumulatedTotals = await getAccumulatedTotals(storeId);

    const xReadingData: BIRXReadingData = {
      // Store & Machine Info
      businessName: birConfig.business_name,
      businessAddress: birConfig.business_address,
      taxpayerName: birConfig.taxpayer_name,
      tin: birConfig.tin,
      machineId: birConfig.machine_identification_number,
      serialNumber: birConfig.machine_serial_number,
      posVersion: birConfig.pos_version || '1.0',
      permitNumber: birConfig.permit_number,
      
      // Reading Info
      readingNumber: nextReadingNumber,
      resetCounter: resetCounter?.reset_counter || 0,
      readingDate: new Date(),
      terminalId: 'TERMINAL-01',
      cashierName,
      
      // Transaction Range
      beginningReceiptNumber: receiptRange.first || '0000000001',
      endingReceiptNumber: receiptRange.last || '0000000001',
      transactionCount: transactions?.length || 0,
      
      // Sales Breakdown
      grossSales: salesData.grossSales,
      vatSales: salesData.vatSales,
      vatAmount: salesData.vatAmount,
      vatExemptSales: salesData.vatExemptSales,
      zeroRatedSales: salesData.zeroRatedSales,
      
      // Discounts
      scDiscount: salesData.scDiscount,
      pwdDiscount: salesData.pwdDiscount,
      naacDiscount: 0, // Not implemented yet
      spDiscount: 0, // Not implemented yet
      otherDiscounts: salesData.otherDiscounts,
      totalDiscounts: salesData.totalDiscounts,
      
      // Net Sales
      netSales: salesData.netSales,
      
      // Accumulated Totals
      accumulatedGrossSales: accumulatedTotals.grossSales + salesData.grossSales,
      accumulatedNetSales: accumulatedTotals.netSales + salesData.netSales,
      accumulatedVat: accumulatedTotals.vatAmount + salesData.vatAmount,
    };

    // Save the reading to database
    await saveBIRReading(storeId, 'X', xReadingData, shiftId);

    return xReadingData;
  } catch (error) {
    console.error('Error generating BIR X-Reading:', error);
    throw new Error(`Failed to generate X-Reading: ${error.message}`);
  }
}

function calculateSalesData(transactions: any[]) {
  let grossSales = 0;
  let vatSales = 0;
  let vatAmount = 0;
  let vatExemptSales = 0;
  let zeroRatedSales = 0;
  let scDiscount = 0;
  let pwdDiscount = 0;
  let otherDiscounts = 0;

  transactions.forEach(transaction => {
    const subtotal = transaction.subtotal || 0;
    const total = transaction.total || 0;
    const vat = transaction.vat_amount || 0;
    const vatSalesAmount = transaction.vat_sales || 0;
    const vatExempt = transaction.vat_exempt_sales || 0;
    const zeroRated = transaction.zero_rated_sales || 0;

    grossSales += subtotal;
    vatSales += vatSalesAmount;
    vatAmount += vat;
    vatExemptSales += vatExempt;
    zeroRatedSales += zeroRated;

    // Calculate discounts
    if (transaction.discount_type === 'senior') {
      scDiscount += transaction.senior_citizen_discount || transaction.discount_amount || 0;
    } else if (transaction.discount_type === 'pwd') {
      pwdDiscount += transaction.pwd_discount || transaction.discount_amount || 0;
    } else if (transaction.discount_amount > 0) {
      otherDiscounts += transaction.discount_amount;
    }
  });

  const totalDiscounts = scDiscount + pwdDiscount + otherDiscounts;
  const netSales = grossSales - totalDiscounts;

  return {
    grossSales,
    vatSales,
    vatAmount,
    vatExemptSales,
    zeroRatedSales,
    scDiscount,
    pwdDiscount,
    otherDiscounts,
    totalDiscounts,
    netSales,
  };
}

function getReceiptRange(transactions: any[]) {
  if (!transactions.length) {
    return { first: '0000000001', last: '0000000001' };
  }

  const receiptNumbers = transactions
    .map(t => t.receipt_number)
    .filter(Boolean)
    .sort();

  return {
    first: receiptNumbers[0] || '0000000001',
    last: receiptNumbers[receiptNumbers.length - 1] || '0000000001',
  };
}

async function getAccumulatedTotals(storeId: string) {
  const { data: cumulativeSales } = await supabase
    .from('bir_cumulative_sales')
    .select('*')
    .eq('store_id', storeId)
    .single();

  if (!cumulativeSales) {
    return {
      grossSales: 0,
      netSales: 0,
      vatAmount: 0,
    };
  }

  return {
    grossSales: cumulativeSales.grand_total_sales || 0,
    netSales: cumulativeSales.grand_total_sales || 0, // Simplified for now
    vatAmount: 0, // Would need additional calculation
  };
}

async function saveBIRReading(storeId: string, readingType: 'X' | 'Z', data: BIRXReadingData, shiftId?: string) {
  const { error } = await supabase
    .from('bir_readings')
    .insert({
      store_id: storeId,
      reading_type: readingType,
      reading_number: data.readingNumber,
      shift_id: shiftId,
      reset_counter: data.resetCounter,
      beginning_si_number: data.beginningReceiptNumber,
      ending_si_number: data.endingReceiptNumber,
      transaction_count: data.transactionCount,
      gross_sales: data.grossSales,
      vat_sales: data.vatSales,
      vat_amount: data.vatAmount,
      vat_exempt_sales: data.vatExemptSales,
      zero_rated_sales: data.zeroRatedSales,
      sc_discount: data.scDiscount,
      pwd_discount: data.pwdDiscount,
      other_discounts: data.otherDiscounts,
      total_discounts: data.totalDiscounts,
      net_sales: data.netSales,
      accumulated_gross_sales: data.accumulatedGrossSales,
      accumulated_net_sales: data.accumulatedNetSales,
      accumulated_vat: data.accumulatedVat,
      cashier_name: data.cashierName,
      printed_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving BIR reading:', error);
    throw error;
  }
}