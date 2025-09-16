import { supabase } from "@/integrations/supabase/client";
import { generateBIRXReading, BIRXReadingData } from './enhancedXReadingReport';

export interface BIRZReadingData extends BIRXReadingData {
  // Cash Management (Z-Reading specific)
  beginningCash: number;
  cashSales: number;
  cashPayouts: number;
  expectedCash: number;
  actualCash: number;
  cashVariance: number;
  
  // Manager Info
  managerName: string;
  
  // Additional Z-Reading fields
  totalRefunds: number;
}

export async function generateBIRZReading(
  storeId: string, 
  shiftId: string,
  actualCash: number,
  managerName: string
): Promise<BIRZReadingData> {
  try {
    // Generate base X-Reading data
    const xReadingData = await generateBIRXReading(storeId, shiftId);
    
    // Get shift data for cash management
    const { data: shift } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (!shift) {
      throw new Error('Shift not found');
    }

    // Calculate cash management data
    const beginningCash = shift.starting_cash || 0;
    const cashSales = await calculateCashSales(storeId, shift.created_at);
    const cashPayouts = await calculateCashPayouts(storeId, shift.created_at);
    const totalRefunds = await calculateRefunds(storeId, shift.created_at);
    const expectedCash = beginningCash + cashSales - cashPayouts - totalRefunds;
    const cashVariance = actualCash - expectedCash;

    const zReadingData: BIRZReadingData = {
      ...xReadingData,
      
      // Cash Management
      beginningCash,
      cashSales,
      cashPayouts,
      expectedCash,
      actualCash,
      cashVariance,
      totalRefunds,
      
      // Manager Info
      managerName,
    };

    // Save Z-Reading (will override the X-Reading entry)
    await saveBIRZReading(storeId, zReadingData, shiftId);
    
    // Update cumulative sales
    await updateCumulativeSales(storeId, zReadingData);
    
    // Create daily summary
    await createDailySummary(storeId, zReadingData);
    
    // Close the shift
    await closeShift(shiftId, actualCash);

    return zReadingData;
  } catch (error) {
    console.error('Error generating BIR Z-Reading:', error);
    throw new Error(`Failed to generate Z-Reading: ${error.message}`);
  }
}

async function calculateCashSales(storeId: string, shiftStartTime: string): Promise<number> {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('total, payment_method')
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .eq('payment_method', 'cash')
    .gte('created_at', shiftStartTime);

  return transactions?.reduce((sum, transaction) => sum + (transaction.total || 0), 0) || 0;
}

async function calculateCashPayouts(storeId: string, shiftStartTime: string): Promise<number> {
  // This would include expenses, petty cash, etc.
  // For now, returning 0 as we don't have expense tracking during shifts
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('store_id', storeId)
    .gte('created_at', shiftStartTime);

  return expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
}

async function calculateRefunds(storeId: string, shiftStartTime: string): Promise<number> {
  // Get voided transactions that were refunded
  const { data: voidedTransactions } = await supabase
    .from('void_transactions')
    .select('original_total')
    .eq('store_id', storeId)
    .eq('void_reason', 'refund')
    .gte('void_date', shiftStartTime);

  return voidedTransactions?.reduce((sum, transaction) => sum + (transaction.original_total || 0), 0) || 0;
}

async function saveBIRZReading(storeId: string, data: BIRZReadingData, shiftId: string) {
  // Update the existing reading to Z-Reading type with additional data
  const { error } = await supabase
    .from('bir_readings')
    .update({
      reading_type: 'Z',
      beginning_cash: data.beginningCash,
      cash_sales: data.cashSales,
      cash_payouts: data.cashPayouts,
      expected_cash: data.expectedCash,
      actual_cash: data.actualCash,
      cash_variance: data.cashVariance,
      manager_name: data.managerName,
      printed_at: new Date().toISOString(),
    })
    .eq('store_id', storeId)
    .eq('shift_id', shiftId)
    .eq('reading_number', data.readingNumber);

  if (error) {
    console.error('Error saving BIR Z-Reading:', error);
    throw error;
  }
}

async function updateCumulativeSales(storeId: string, data: BIRZReadingData) {
  const { error } = await supabase
    .from('bir_cumulative_sales')
    .upsert({
      store_id: storeId,
      terminal_id: data.terminalId,
      grand_total_sales: data.accumulatedGrossSales,
      grand_total_transactions: await getTotalTransactionCount(storeId),
      last_receipt_number: data.endingReceiptNumber,
      last_transaction_date: new Date().toISOString(),
    });

  if (error) {
    console.error('Error updating cumulative sales:', error);
  }
}

async function getTotalTransactionCount(storeId: string): Promise<number> {
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('status', 'completed');

  return count || 0;
}

async function createDailySummary(storeId: string, data: BIRZReadingData) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get top selling items for the day
  const { data: topItems } = await supabase
    .from('transactions')
    .select('items')
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`);

  // Process top selling items
  const itemSales: Record<string, any> = {};
  topItems?.forEach(transaction => {
    if (transaction.items && Array.isArray(transaction.items)) {
      transaction.items.forEach((item: any) => {
        const key = item.name;
        if (!itemSales[key]) {
          itemSales[key] = { name: key, quantity: 0, sales: 0 };
        }
        itemSales[key].quantity += item.quantity;
        itemSales[key].sales += item.price * item.quantity;
      });
    }
  });

  const topItemsArray = Object.values(itemSales)
    .sort((a: any, b: any) => b.sales - a.sales)
    .slice(0, 10);

  // Get payment method breakdown
  const { data: paymentBreakdown } = await supabase
    .from('transactions')
    .select('payment_method, total')
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`);

  const paymentSummary: Record<string, number> = {};
  paymentBreakdown?.forEach(transaction => {
    const method = transaction.payment_method || 'cash';
    if (!paymentSummary[method]) {
      paymentSummary[method] = 0;
    }
    paymentSummary[method] += transaction.total || 0;
  });

  // Save daily summary
  const { error } = await supabase
    .from('bir_daily_summary')
    .upsert({
      store_id: storeId,
      business_date: today,
      terminal_id: data.terminalId,
      total_gross_sales: data.grossSales,
      total_net_sales: data.netSales,
      total_vat_sales: data.vatSales,
      total_vat_amount: data.vatAmount,
      total_vat_exempt: data.vatExemptSales,
      total_zero_rated: data.zeroRatedSales,
      total_discounts: data.totalDiscounts,
      total_transactions: data.transactionCount,
      top_items: JSON.parse(JSON.stringify(topItemsArray)),
      payment_breakdown: JSON.parse(JSON.stringify(paymentSummary)),
      is_closed: true,
      closed_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error creating daily summary:', error);
  }
}

async function closeShift(shiftId: string, actualCash: number) {
  const { error } = await supabase
    .from('shifts')
    .update({
      status: 'closed',
      ending_cash: actualCash,
      ended_at: new Date().toISOString(),
    })
    .eq('id', shiftId);

  if (error) {
    console.error('Error closing shift:', error);
  }
}