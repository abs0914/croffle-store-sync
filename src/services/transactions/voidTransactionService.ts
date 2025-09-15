import { supabase } from '@/integrations/supabase/client';
import { nowInPhilippines, formatDateTime } from '@/utils';
import { executeWithValidSession } from "@/contexts/auth/session-utils";

export type VoidReasonCategory = 
  | 'customer_request' 
  | 'cashier_error' 
  | 'system_error' 
  | 'management_decision'
  | 'refund' 
  | 'exchange' 
  | 'price_correction' 
  | 'item_unavailable' 
  | 'other';

// Legacy interface for backward compatibility
export interface LegacyVoidTransactionData {
  id: string;
  receiptNumber: string;
  receipt_number?: string; // Legacy support
  total: number;
  createdAt: string;
  created_at?: string; // Legacy support
  status: string;
  reasonCategory?: string;
  voidedBy?: string;
  transactionId?: string;
  reason?: string;
  notes?: string;
  payment_method?: string;
  customers?: any;
  items?: any[];
  discount?: number;
  discount_type?: string;
}

export type VoidTransactionData = {
  id: string;
  store_id: string;
  original_transaction_id: string;
  original_receipt_number: string;
  void_receipt_number: string;
  void_reason_category: VoidReasonCategory;
  void_reason: string;
  void_notes?: string;
  voided_by_user_id: string;
  voided_by_cashier_name: string;
  authorized_by_user_id?: string;
  authorized_by_name?: string;
  original_total: number;
  original_vat_amount: number;
  original_discount_amount: number;
  original_items: any[];
  terminal_id: string;
  sequence_number: number;
  void_date: string;
  original_transaction_date: string;
  is_bir_reported: boolean;
  bir_report_date?: string;
  created_at: string;
  updated_at: string;
};

export interface VoidRequestData {
  storeId: string;
  transactionId: string;
  receiptNumber: string;
  reasonCategory: VoidReasonCategory;
  reason: string;
  notes?: string;
  voidedBy: string;
  cashierName: string;
  authorizedBy?: string;
  authorizerName?: string;
  terminalId?: string;
}

export interface BIRVoidReportData {
  storeId: string;
  storeName: string;
  dateRange: {
    from: string;
    to: string;
  };
  voidTransactions: VoidTransactionData[];
  summary: {
    totalVoids: number;
    totalVoidAmount: number;
    voidsByCategory: Array<{
      category: VoidReasonCategory;
      count: number;
      amount: number;
    }>;
    voidsByDate: Array<{
      date: string;
      count: number;
      amount: number;
    }>;
  };
}

// Generate void receipt number
const generateVoidReceiptNumber = async (storeId: string): Promise<string> => {
  const today = nowInPhilippines().toISOString().split('T')[0].replace(/-/g, '');
  
  const { data, error } = await supabase
    .from('void_transactions')
    .select('void_receipt_number')
    .eq('store_id', storeId)
    .like('void_receipt_number', `VOID-${today}-%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  const lastNumber = data?.[0]?.void_receipt_number?.split('-')[2] || '0000';
  const nextNumber = (parseInt(lastNumber) + 1).toString().padStart(4, '0');
  
  return `VOID-${today}-${nextNumber}`;
};

export const voidTransaction = async (voidData: VoidRequestData) => {
  try {
    // Get original transaction data
    const { data: originalTransaction, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        *,
        store:stores(name)
      `)
      .eq('id', voidData.transactionId)
      .single();

    if (transactionError || !originalTransaction) {
      throw new Error('Original transaction not found');
    }

    // Check if already voided
    const { data: existingVoid } = await supabase
      .from('void_transactions')
      .select('id')
      .eq('original_transaction_id', voidData.transactionId)
      .single();

    if (existingVoid) {
      throw new Error('Transaction has already been voided');
    }

    // Generate void receipt number
    const voidReceiptNumber = await generateVoidReceiptNumber(voidData.storeId);

    // Create void transaction record
    const { data: voidTransaction, error: voidError } = await supabase
      .from('void_transactions')
      .insert({
        store_id: voidData.storeId,
        original_transaction_id: voidData.transactionId,
        original_receipt_number: voidData.receiptNumber,
        void_receipt_number: voidReceiptNumber,
        void_reason_category: voidData.reasonCategory,
        void_reason: voidData.reason,
        void_notes: voidData.notes,
        voided_by_user_id: voidData.voidedBy,
        voided_by_cashier_name: voidData.cashierName,
        authorized_by_user_id: voidData.authorizedBy,
        authorized_by_name: voidData.authorizerName,
        original_total: originalTransaction.total,
        original_vat_amount: originalTransaction.vat_amount || 0,
        original_discount_amount: originalTransaction.discount_amount || 0,
        original_items: originalTransaction.items,
        terminal_id: voidData.terminalId || 'TERMINAL-01',
        original_transaction_date: originalTransaction.created_at,
      })
      .select()
      .single();

    if (voidError) throw voidError;

    // Update original transaction status
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ 
        status: 'voided',
        updated_at: nowInPhilippines().toISOString()
      })
      .eq('id', voidData.transactionId);

    if (updateError) throw updateError;

    return {
      success: true,
      message: 'Transaction voided successfully',
      voidReceiptNumber,
      voidTransaction
    };

  } catch (error: any) {
    console.error('Error voiding transaction:', error);
    return {
      success: false,
      message: error.message || 'Failed to void transaction'
    };
  }
};

export const getVoidableTransactions = async (
  storeId: string,
  additionalFilters?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<LegacyVoidTransactionData[]> => {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        id,
        receipt_number,
        total,
        created_at,
        status,
        items,
        discount,
        discount_type,
        vat_amount,
        discount_amount,
        cashier_name
      `)
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (additionalFilters?.startDate) {
      query = query.gte('created_at', additionalFilters.startDate);
    }
    
    if (additionalFilters?.endDate) {
      query = query.lte('created_at', additionalFilters.endDate);
    }

    if (additionalFilters?.limit) {
      query = query.limit(additionalFilters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Check which transactions are already voided
    const transactionIds = data?.map(t => t.id) || [];
    const { data: voidedTransactions } = await supabase
      .from('void_transactions')
      .select('original_transaction_id')
      .in('original_transaction_id', transactionIds);

    const voidedIds = new Set(voidedTransactions?.map(v => v.original_transaction_id) || []);

    // Filter out already voided transactions
    return (data || [])
      .filter(transaction => !voidedIds.has(transaction.id))
      .map(transaction => ({
        id: transaction.id,
        receiptNumber: transaction.receipt_number,
        receipt_number: transaction.receipt_number,
        total: transaction.total,
        createdAt: transaction.created_at,
        created_at: transaction.created_at,
        status: transaction.status,
        items: transaction.items,
        discount: transaction.discount,
        discount_type: transaction.discount_type,
        payment_method: 'cash' // Default fallback
      })) as LegacyVoidTransactionData[];

  } catch (error) {
    console.error('Error getting voidable transactions:', error);
    return [];
  }
};

export const getVoidTransactions = async (
  storeId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    reasonCategory?: VoidReasonCategory;
    limit?: number;
  }
): Promise<VoidTransactionData[]> => {
  try {
    let query = supabase
      .from('void_transactions')
      .select('*')
      .eq('store_id', storeId)
      .order('void_date', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('void_date', filters.startDate);
    }
    
    if (filters?.endDate) {
      query = query.lte('void_date', filters.endDate);
    }

    if (filters?.reasonCategory) {
      query = query.eq('void_reason_category', filters.reasonCategory);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      void_reason_category: item.void_reason_category as VoidReasonCategory,
      original_items: Array.isArray(item.original_items) 
        ? item.original_items 
        : JSON.parse(item.original_items as string || '[]')
    }));
  } catch (error) {
    console.error('Error getting void transactions:', error);
    return [];
  }
};

export const generateBIRVoidReport = async (
  storeId: string,
  dateRange: { from: string; to: string }
): Promise<BIRVoidReportData> => {
  // Critical: Use enhanced session validation
  return await executeWithValidSession(async () => {
    const [voidTransactions, storeData] = await Promise.all([
      getVoidTransactions(storeId, {
        startDate: dateRange.from,
        endDate: dateRange.to
      }),
      supabase
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .single()
    ]);

    const storeName = storeData.data?.name || 'Unknown Store';

    // Calculate summary statistics
    const totalVoids = voidTransactions.length;
    const totalVoidAmount = voidTransactions.reduce((sum, vt) => sum + vt.original_total, 0);

    // Group by category
    const voidsByCategory = Array.from(
      voidTransactions.reduce((acc, vt) => {
        const existing = acc.get(vt.void_reason_category) || { count: 0, amount: 0 };
        existing.count++;
        existing.amount += vt.original_total;
        acc.set(vt.void_reason_category, existing);
        return acc;
      }, new Map<VoidReasonCategory, { count: number; amount: number }>())
    ).map(([category, data]) => ({ category, ...data }));

    // Group by date
    const voidsByDate = Array.from(
      voidTransactions.reduce((acc, vt) => {
        const date = vt.void_date.split('T')[0];
        const existing = acc.get(date) || { count: 0, amount: 0 };
        existing.count++;
        existing.amount += vt.original_total;
        acc.set(date, existing);
        return acc;
      }, new Map<string, { count: number; amount: number }>())
    ).map(([date, data]) => ({ date, ...data }))
     .sort((a, b) => a.date.localeCompare(b.date));

    return {
      storeId,
      storeName,
      dateRange,
      voidTransactions,
      summary: {
        totalVoids,
        totalVoidAmount,
        voidsByCategory,
        voidsByDate
      }
    };
  }, 'BIR void report generation');
};

export const VoidTransactionService = {
  voidTransaction,
  getVoidableTransactions,
  getVoidTransactions,
  generateBIRVoidReport
};