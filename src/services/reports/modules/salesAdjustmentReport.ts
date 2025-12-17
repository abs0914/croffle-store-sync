import { supabase } from '@/integrations/supabase/client';
import { executeWithValidSession } from "@/contexts/auth/session-utils";

export interface RefundTransaction {
  id: string;
  store_id: string;
  original_transaction_id: string;
  original_receipt_number: string;
  refund_receipt_number: string;
  refund_type: 'full' | 'partial';
  refund_reason_category: string;
  refund_reason: string;
  refund_notes?: string;
  refunded_items: Array<{ name: string; quantity: number; price: number; refundAmount: number }>;
  original_transaction_total: number;
  refund_amount: number;
  refund_vat_amount: number;
  refund_method: string;
  processed_by_name: string;
  authorized_by_name?: string;
  terminal_id: string;
  refund_date: string;
  created_at: string;
}

export interface VoidTransaction {
  id: string;
  store_id: string;
  original_transaction_id: string;
  original_receipt_number: string;
  void_receipt_number: string;
  void_reason_category: string;
  void_reason: string;
  void_notes?: string;
  voided_by_cashier_name: string;
  authorized_by_name?: string;
  original_total: number;
  original_vat_amount: number;
  original_discount_amount: number;
  original_items: Array<{ name: string; quantity: number; price: number }>;
  terminal_id: string;
  void_date: string;
  is_bir_reported: boolean;
}

export interface SalesAdjustmentReportData {
  storeId: string;
  storeName: string;
  dateRange: { from: string; to: string };
  voidTransactions: VoidTransaction[];
  refundTransactions: RefundTransaction[];
  summary: {
    totalVoids: number;
    totalVoidAmount: number;
    totalRefunds: number;
    totalRefundAmount: number;
    totalAdjustments: number;
    totalAdjustmentAmount: number;
    voidsByCategory: Array<{ category: string; count: number; amount: number }>;
    refundsByCategory: Array<{ category: string; count: number; amount: number }>;
  };
}

export interface SalesAdjustmentReportResponse {
  data: SalesAdjustmentReportData;
  metadata: {
    dataSource: 'real' | 'sample';
    generatedAt: string;
    debugInfo?: {
      voidCount?: number;
      refundCount?: number;
      fallbackReason?: string;
    };
  };
}

export const fetchSalesAdjustmentReport = async (
  storeId: string,
  dateRange: { from: Date | undefined; to: Date | undefined }
): Promise<SalesAdjustmentReportResponse> => {
  try {
    return await executeWithValidSession(async () => {
      console.log('Fetching sales adjustment report for store:', storeId, 'date range:', dateRange);

      const fromDate = dateRange.from?.toISOString().split('T')[0] || 
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = dateRange.to?.toISOString().split('T')[0] || 
        new Date().toISOString().split('T')[0];

      // Fetch store info
      const { data: storeData } = await supabase
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .single();

      // Fetch void transactions
      const { data: voidData, error: voidError } = await supabase
        .from('void_transactions')
        .select('*')
        .eq('store_id', storeId)
        .gte('void_date', fromDate + 'T00:00:00Z')
        .lte('void_date', toDate + 'T23:59:59Z')
        .order('void_date', { ascending: false });

      if (voidError) {
        console.error('Error fetching void transactions:', voidError);
      }

      // Fetch refund transactions
      const { data: refundData, error: refundError } = await supabase
        .from('refunds')
        .select('*')
        .eq('store_id', storeId)
        .gte('refund_date', fromDate + 'T00:00:00Z')
        .lte('refund_date', toDate + 'T23:59:59Z')
        .order('refund_date', { ascending: false });

      if (refundError) {
        console.error('Error fetching refund transactions:', refundError);
      }

      const voidTransactions: VoidTransaction[] = (voidData || []).map(vt => ({
        id: vt.id,
        store_id: vt.store_id,
        original_transaction_id: vt.original_transaction_id,
        original_receipt_number: vt.original_receipt_number,
        void_receipt_number: vt.void_receipt_number,
        void_reason_category: vt.void_reason_category,
        void_reason: vt.void_reason,
        void_notes: vt.void_notes,
        voided_by_cashier_name: vt.voided_by_cashier_name,
        authorized_by_name: vt.authorized_by_name,
        original_total: Number(vt.original_total) || 0,
        original_vat_amount: Number(vt.original_vat_amount) || 0,
        original_discount_amount: Number(vt.original_discount_amount) || 0,
        original_items: typeof vt.original_items === 'string' 
          ? JSON.parse(vt.original_items) 
          : (vt.original_items || []),
        terminal_id: vt.terminal_id,
        void_date: vt.void_date,
        is_bir_reported: vt.is_bir_reported || false
      }));

      const refundTransactions: RefundTransaction[] = (refundData || []).map(rt => ({
        id: rt.id,
        store_id: rt.store_id,
        original_transaction_id: rt.original_transaction_id,
        original_receipt_number: rt.original_receipt_number,
        refund_receipt_number: rt.refund_receipt_number,
        refund_type: rt.refund_type as 'full' | 'partial',
        refund_reason_category: rt.refund_reason_category,
        refund_reason: rt.refund_reason,
        refund_notes: rt.refund_notes,
        refunded_items: typeof rt.refunded_items === 'string' 
          ? JSON.parse(rt.refunded_items) 
          : (rt.refunded_items || []),
        original_transaction_total: Number(rt.original_transaction_total) || 0,
        refund_amount: Number(rt.refund_amount) || 0,
        refund_vat_amount: Number(rt.refund_vat_amount) || 0,
        refund_method: rt.refund_method,
        processed_by_name: rt.processed_by_name,
        authorized_by_name: rt.authorized_by_name,
        terminal_id: rt.terminal_id,
        refund_date: rt.refund_date,
        created_at: rt.created_at
      }));

      // Calculate summaries
      const totalVoidAmount = voidTransactions.reduce((sum, vt) => sum + vt.original_total, 0);
      const totalRefundAmount = refundTransactions.reduce((sum, rt) => sum + rt.refund_amount, 0);

      // Group voids by category
      const voidsByCategory = voidTransactions.reduce((acc, vt) => {
        const existing = acc.find(c => c.category === vt.void_reason_category);
        if (existing) {
          existing.count++;
          existing.amount += vt.original_total;
        } else {
          acc.push({ category: vt.void_reason_category, count: 1, amount: vt.original_total });
        }
        return acc;
      }, [] as Array<{ category: string; count: number; amount: number }>);

      // Group refunds by category
      const refundsByCategory = refundTransactions.reduce((acc, rt) => {
        const existing = acc.find(c => c.category === rt.refund_reason_category);
        if (existing) {
          existing.count++;
          existing.amount += rt.refund_amount;
        } else {
          acc.push({ category: rt.refund_reason_category, count: 1, amount: rt.refund_amount });
        }
        return acc;
      }, [] as Array<{ category: string; count: number; amount: number }>);

      return {
        data: {
          storeId,
          storeName: storeData?.name || 'Unknown Store',
          dateRange: {
            from: fromDate + 'T00:00:00Z',
            to: toDate + 'T23:59:59Z'
          },
          voidTransactions,
          refundTransactions,
          summary: {
            totalVoids: voidTransactions.length,
            totalVoidAmount,
            totalRefunds: refundTransactions.length,
            totalRefundAmount,
            totalAdjustments: voidTransactions.length + refundTransactions.length,
            totalAdjustmentAmount: totalVoidAmount + totalRefundAmount,
            voidsByCategory: voidsByCategory.sort((a, b) => b.count - a.count),
            refundsByCategory: refundsByCategory.sort((a, b) => b.count - a.count)
          }
        },
        metadata: {
          dataSource: 'real',
          generatedAt: new Date().toISOString(),
          debugInfo: {
            voidCount: voidTransactions.length,
            refundCount: refundTransactions.length
          }
        }
      };
    }, 'Sales Adjustment Report generation');
  } catch (error) {
    console.error('Error fetching sales adjustment report:', error);
    
    return {
      data: generateSampleSalesAdjustmentReport(storeId),
      metadata: {
        dataSource: 'sample',
        generatedAt: new Date().toISOString(),
        debugInfo: {
          fallbackReason: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    };
  }
};

const generateSampleSalesAdjustmentReport = (storeId: string): SalesAdjustmentReportData => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    storeId,
    storeName: 'Sample Store',
    dateRange: {
      from: yesterday + 'T00:00:00Z',
      to: today + 'T23:59:59Z'
    },
    voidTransactions: [],
    refundTransactions: [],
    summary: {
      totalVoids: 0,
      totalVoidAmount: 0,
      totalRefunds: 0,
      totalRefundAmount: 0,
      totalAdjustments: 0,
      totalAdjustmentAmount: 0,
      voidsByCategory: [],
      refundsByCategory: []
    }
  };
};
