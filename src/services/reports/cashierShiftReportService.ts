import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, format } from "date-fns";

export interface CashierShiftData {
  shiftId: string;
  startTime: string;
  endTime: string | null;
  startingCash: number;
  endingCash: number | null;
  startPhoto: string | null;
  endPhoto: string | null;
  status: 'active' | 'closed';
  cashierName?: string;
}

export interface CashierShiftSales {
  totalTransactions: number;
  totalSales: number;
  averageTransactionValue: number;
  cashSales: number;
  cardSales: number;
  gcashSales: number;
  discountAmount: number;
  refundAmount: number;
  paidInAmount: number;
  paidOutAmount: number;
  hourlyBreakdown: Array<{
    hour: string;
    sales: number;
    transactions: number;
  }>;
}

export interface CashierDailyReport {
  shift: CashierShiftData;
  sales: CashierShiftSales;
  cashVariance: number;
  previousShiftEndingCash: number | null;
}

export async function fetchCashierShiftReport(
  userId: string,
  storeId: string,
  date: Date = new Date()
): Promise<CashierDailyReport | null> {
  try {
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    console.log('🔍 Fetching cashier shift report for:', {
      userId,
      storeId,
      date: date.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // First, try to get shift data for the specified date
    let { data: shiftData, error: shiftError } = await supabase
      .from('shifts')
      .select(`
        id,
        start_time,
        end_time,
        starting_cash,
        ending_cash,
        start_photo,
        end_photo,
        status,
        cashier_id
      `)
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If no shift found for the specific date, try to find a shift linked to transactions on this date
    if (!shiftData) {
      console.log('📅 No shift found for the specified date, checking for shift linked to transactions...');
      
      // Get transactions for the specified date
      const { data: dateTransactions } = await supabase
        .from('transactions')
        .select('shift_id')
        .eq('user_id', userId)
        .eq('store_id', storeId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed')
        .not('shift_id', 'is', null)
        .limit(1);

      if (dateTransactions && dateTransactions.length > 0) {
        const shiftId = dateTransactions[0].shift_id;
        console.log('🔗 Found shift linked to transactions:', shiftId);
        
        // Get the shift data using the shift_id from transactions
        const { data: linkedShift, error: linkedError } = await supabase
          .from('shifts')
          .select(`
            id,
            start_time,
            end_time,
            starting_cash,
            ending_cash,
            start_photo,
            end_photo,
            status,
            cashier_id
          `)
          .eq('id', shiftId)
          .single();

        if (linkedError) {
          console.error('❌ Error fetching linked shift:', linkedError);
        } else {
          shiftData = linkedShift;
          console.log('✅ Using linked shift data for report');
        }
      }
    }

    if (shiftError && shiftError.code !== 'PGRST116') throw shiftError;
    if (!shiftData) {
      console.log('ℹ️ No shift data found for the specified date or linked to transactions');
      return null;
    }

    // Get cashier name if available
    let cashierName = undefined;
    if (shiftData.cashier_id) {
      const { data: cashierData } = await supabase
        .from('cashiers')
        .select('first_name, last_name')
        .eq('id', shiftData.cashier_id)
        .single();
      
      if (cashierData) {
        cashierName = `${cashierData.first_name} ${cashierData.last_name}`;
      }
    }

    // Get sales data for the shift period
    const shiftStart = new Date(shiftData.start_time);
    const shiftEnd = shiftData.end_time ? new Date(shiftData.end_time) : new Date();

    // Get sales data - try shift_id first, but filter by the selected date
    let salesResult;
    
    // Primary approach: Use shift_id but filter transactions by the selected date
    if (shiftData.id) {
      salesResult = await supabase
        .from('transactions')
        .select('id, total, payment_method, created_at, status, discount_amount, subtotal, tax')
        .eq('store_id', storeId)
        .eq('shift_id', shiftData.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed');
    }
    
    // Fallback approach: Use user_id and time range if no shift-linked transactions
    const { data: salesData, error: salesError } = salesResult;
    
    let transactions = salesData || [];
    
    // If no transactions found with shift_id for the selected date, try user_id approach
    if (transactions.length === 0) {
      const fallbackResult = await supabase
        .from('transactions')
        .select('id, total, payment_method, created_at, status, discount_amount, subtotal, tax')
        .eq('store_id', storeId)
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed');
      
      if (fallbackResult.error) throw fallbackResult.error;
      transactions = fallbackResult.data || [];
    }
    
    console.log('💰 Found transactions for selected date:', {
      count: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + (t.total || 0), 0)
    });
    
    if (salesError) throw salesError;

    // Process sales data
    const totalTransactions = transactions.length;
    const totalSales = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
    const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Calculate payment method breakdown
    const cashSales = transactions
      .filter(t => t.payment_method === 'cash')
      .reduce((sum, t) => sum + (t.total || 0), 0);
    
    const cardSales = transactions
      .filter(t => t.payment_method === 'card')
      .reduce((sum, t) => sum + (t.total || 0), 0);
    
    const gcashSales = transactions
      .filter(t => ['gcash', 'paymaya', 'e-wallet'].includes(t.payment_method || ''))
      .reduce((sum, t) => sum + (t.total || 0), 0);

    // Calculate discount amounts with proper null checking
    const discountAmount = transactions
      .reduce((sum, t) => sum + (Number(t.discount_amount) || 0), 0);
    
    const refundAmount = 0; // TODO: Add refund tracking
    const paidInAmount = 0; // TODO: Add paid in tracking  
    const paidOutAmount = 0; // TODO: Add paid out tracking

    // Create hourly breakdown
    const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      sales: 0,
      transactions: 0
    }));

    transactions.forEach(transaction => {
      const hour = new Date(transaction.created_at).getHours();
      hourlyBreakdown[hour].sales += transaction.total || 0;
      hourlyBreakdown[hour].transactions += 1;
    });

    // Get previous shift ending cash
    const { data: previousShift } = await supabase
      .from('shifts')
      .select('ending_cash')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .eq('status', 'closed')
      .lt('start_time', shiftStart.toISOString())
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    const shift: CashierShiftData = {
      shiftId: shiftData.id,
      startTime: shiftData.start_time,
      endTime: shiftData.end_time,
      startingCash: shiftData.starting_cash,
      endingCash: shiftData.ending_cash,
      startPhoto: shiftData.start_photo,
      endPhoto: shiftData.end_photo,
      status: shiftData.status as 'active' | 'closed',
      cashierName
    };

    const sales: CashierShiftSales = {
      totalTransactions,
      totalSales,
      averageTransactionValue,
      cashSales,
      cardSales,
      gcashSales,
      discountAmount,
      refundAmount,
      paidInAmount,
      paidOutAmount,
      hourlyBreakdown
    };

    const expectedEndingCash = shiftData.starting_cash + cashSales;
    const actualEndingCash = shiftData.ending_cash || 0;
    const cashVariance = actualEndingCash - expectedEndingCash;

    return {
      shift,
      sales,
      cashVariance,
      previousShiftEndingCash: previousShift?.ending_cash || null
    };

  } catch (error) {
    console.error('Error fetching cashier shift report:', error);
    throw error;
  }
}

export async function fetchCashierShiftHistory(
  userId: string,
  storeId: string,
  limit: number = 7
): Promise<CashierShiftData[]> {
  try {
    const { data, error } = await supabase
      .from('shifts')
      .select(`
        id,
        start_time,
        end_time,
        starting_cash,
        ending_cash,
        start_photo,
        end_photo,
        status,
        cashier_id
      `)
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data?.map(shift => ({
      shiftId: shift.id,
      startTime: shift.start_time,
      endTime: shift.end_time,
      startingCash: shift.starting_cash,
      endingCash: shift.ending_cash,
      startPhoto: shift.start_photo,
      endPhoto: shift.end_photo,
      status: shift.status as 'active' | 'closed'
    })) || [];

  } catch (error) {
    console.error('Error fetching cashier shift history:', error);
    throw error;
  }
}