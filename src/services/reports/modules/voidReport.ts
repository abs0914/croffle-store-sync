import { VoidTransactionService, BIRVoidReportData } from '@/services/transactions/voidTransactionService';
import { formatCurrency, formatDateTime } from '@/utils';
import { executeWithValidSession } from "@/contexts/auth/session-utils";

export interface VoidReportResponse {
  data: BIRVoidReportData;
  metadata: {
    dataSource: 'real' | 'sample';
    generatedAt: string;
    debugInfo?: {
      queryAttempts?: string[];
      fallbackReason?: string;
      recordCount?: number;
    };
  };
}

export const fetchVoidReport = async (
  storeId: string,
  dateRange: { from: Date | undefined; to: Date | undefined }
): Promise<VoidReportResponse> => {
  try {
    // Critical: Use enhanced session validation
    return await executeWithValidSession(async () => {
      console.log('Fetching void report for store:', storeId, 'date range:', dateRange);

      const fromDate = dateRange.from?.toISOString().split('T')[0] || 
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = dateRange.to?.toISOString().split('T')[0] || 
        new Date().toISOString().split('T')[0];

      const voidReport = await VoidTransactionService.generateBIRVoidReport(
        storeId,
        { from: fromDate + 'T00:00:00Z', to: toDate + 'T23:59:59Z' }
      );

      return {
        data: voidReport,
        metadata: {
          dataSource: 'real',
          generatedAt: new Date().toISOString(),
          debugInfo: {
            recordCount: voidReport.voidTransactions.length
          }
        }
      };
    }, 'Void Report generation');
  } catch (error) {
    console.error('Error fetching void report:', error);
    
    // Return sample data if query fails
    return {
      data: generateSampleVoidReport(storeId),
      metadata: {
        dataSource: 'sample',
        generatedAt: new Date().toISOString(),
        debugInfo: {
          fallbackReason: error instanceof Error ? error.message : 'Unknown error',
          recordCount: 3
        }
      }
    };
  }
};

const generateSampleVoidReport = (storeId: string): BIRVoidReportData => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    storeId,
    storeName: 'Sample Store',
    dateRange: {
      from: yesterday + 'T00:00:00Z',
      to: today + 'T23:59:59Z'
    },
    voidTransactions: [
      {
        id: 'void-001',
        store_id: storeId,
        original_transaction_id: 'txn-001',
        original_receipt_number: 'RCT-001',
        void_receipt_number: 'VOID-001',
        void_reason_category: 'customer_request',
        void_reason: 'Customer requested refund',
        void_notes: 'Customer was not satisfied with product quality',
        voided_by_user_id: 'user-001',
        voided_by_cashier_name: 'Jane Doe',
        authorized_by_user_id: 'manager-001',
        authorized_by_name: 'John Manager',
        original_total: 250.00,
        original_vat_amount: 27.27,
        original_discount_amount: 50.00,
        original_items: [
          { name: 'Iced Coffee', quantity: 2, price: 150.00 }
        ],
        terminal_id: 'TERMINAL-01',
        sequence_number: 1,
        void_date: today + 'T10:30:00Z',
        original_transaction_date: today + 'T10:00:00Z',
        is_bir_reported: false,
        created_at: today + 'T10:30:00Z',
        updated_at: today + 'T10:30:00Z'
      },
      {
        id: 'void-002',
        store_id: storeId,
        original_transaction_id: 'txn-002',
        original_receipt_number: 'RCT-002',
        void_receipt_number: 'VOID-002',
        void_reason_category: 'cashier_error',
        void_reason: 'Incorrect item entered',
        voided_by_user_id: 'user-002',
        voided_by_cashier_name: 'Bob Smith',
        original_total: 180.00,
        original_vat_amount: 19.64,
        original_discount_amount: 0,
        original_items: [
          { name: 'Frappe', quantity: 1, price: 180.00 }
        ],
        terminal_id: 'TERMINAL-01',
        sequence_number: 2,
        void_date: yesterday + 'T15:45:00Z',
        original_transaction_date: yesterday + 'T15:30:00Z',
        is_bir_reported: false,
        created_at: yesterday + 'T15:45:00Z',
        updated_at: yesterday + 'T15:45:00Z'
      },
      {
        id: 'void-003',
        store_id: storeId,
        original_transaction_id: 'txn-003',
        original_receipt_number: 'RCT-003',
        void_receipt_number: 'VOID-003',
        void_reason_category: 'system_error',
        void_reason: 'POS system malfunction',
        void_notes: 'System froze during transaction processing',
        voided_by_user_id: 'user-001',
        voided_by_cashier_name: 'Jane Doe',
        authorized_by_user_id: 'manager-001',
        authorized_by_name: 'John Manager',
        original_total: 320.00,
        original_vat_amount: 34.91,
        original_discount_amount: 64.00,
        original_items: [
          { name: 'Milk Tea', quantity: 3, price: 128.00 }
        ],
        terminal_id: 'TERMINAL-02',
        sequence_number: 3,
        void_date: yesterday + 'T09:15:00Z',
        original_transaction_date: yesterday + 'T09:00:00Z',
        is_bir_reported: true,
        bir_report_date: yesterday + 'T23:59:00Z',
        created_at: yesterday + 'T09:15:00Z',
        updated_at: yesterday + 'T09:15:00Z'
      }
    ],
    summary: {
      totalVoids: 3,
      totalVoidAmount: 750.00,
      voidsByCategory: [
        { category: 'customer_request', count: 1, amount: 250.00 },
        { category: 'cashier_error', count: 1, amount: 180.00 },
        { category: 'system_error', count: 1, amount: 320.00 }
      ],
      voidsByDate: [
        { date: yesterday, count: 2, amount: 500.00 },
        { date: today, count: 1, amount: 250.00 }
      ]
    }
  };
};