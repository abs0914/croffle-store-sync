import { supabase } from "@/integrations/supabase/client";
import { BIRAuditLog, BIRCumulativeSales, BIREJournal, BIRReceiptData, BIRComplianceStatus } from "@/types/bir";
import { Transaction } from "@/types/transaction";
import { Store } from "@/types/store";

export class BIRComplianceService {
  
  /**
   * Log BIR audit event
   */
  static async logAuditEvent(
    storeId: string,
    logType: 'transaction' | 'system' | 'modification' | 'access',
    eventName: string,
    eventData: Record<string, any>,
    userId?: string,
    cashierName?: string,
    terminalId: string = 'TERMINAL-01',
    transactionId?: string,
    receiptNumber?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('log_bir_audit', {
        p_store_id: storeId,
        p_log_type: logType,
        p_event_name: eventName,
        p_event_data: eventData,
        p_user_id: userId,
        p_cashier_name: cashierName,
        p_terminal_id: terminalId,
        p_transaction_id: transactionId,
        p_receipt_number: receiptNumber
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging BIR audit event:', error);
      return null;
    }
  }

  /**
   * Get cumulative sales for a store
   */
  static async getCumulativeSales(storeId: string, terminalId: string = 'TERMINAL-01'): Promise<BIRCumulativeSales | null> {
    try {
      const { data, error } = await supabase
        .from('bir_cumulative_sales')
        .select('*')
        .eq('store_id', storeId)
        .eq('terminal_id', terminalId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching cumulative sales:', error);
      return null;
    }
  }

  /**
   * Generate BIR-compliant receipt data
   */
  static generateBIRReceiptData(
    transaction: Transaction, 
    store: Store, 
    cashierName: string
  ): BIRReceiptData {
    // Calculate VAT breakdown
    const vatableSales = transaction.subtotal - (transaction.discount || 0);
    const vatAmount = transaction.tax || 0;
    const vatExemptSales = transaction.vat_exempt_sales || 0;
    const zeroRatedSales = transaction.zero_rated_sales || 0;

    // Calculate discount breakdown
    const seniorDiscount = transaction.discountType === 'senior' ? (transaction.discount || 0) : 0;
    const pwdDiscount = transaction.discountType === 'pwd' ? (transaction.discount || 0) : 0;
    const employeeDiscount = transaction.discountType === 'employee' ? (transaction.discount || 0) : 0;
    const otherDiscount = (transaction.discount || 0) - seniorDiscount - pwdDiscount - employeeDiscount;

    return {
      businessName: store.business_name || store.name,
      taxpayerName: store.business_name || store.name,
      tin: store.tin || '000000000000',
      address: store.address || '',
      receiptNumber: transaction.receiptNumber,
      machineAccreditationNumber: store.machine_accreditation_number || 'N/A',
      serialNumber: store.machine_serial_number || 'N/A',
      terminalId: transaction.terminal_id || 'TERMINAL-01',
      transactionDate: transaction.createdAt,
      cashierName,
      items: transaction.items.map(item => ({
        quantity: item.quantity,
        description: item.name,
        unitPrice: item.unitPrice,
        amount: item.totalPrice,
        isVatExempt: false, // Can be enhanced based on product settings
        isZeroRated: false
      })),
      subtotal: transaction.subtotal,
      vatableSales,
      vatExemptSales,
      zeroRatedSales,
      vatAmount,
      discounts: {
        senior: seniorDiscount,
        pwd: pwdDiscount,
        employee: employeeDiscount,
        other: otherDiscount,
        total: transaction.discount || 0
      },
      totalAmount: transaction.total,
      amountDue: transaction.total - (transaction.discount || 0),
      paymentMethod: transaction.paymentMethod,
      amountTendered: transaction.amountTendered,
      change: transaction.change
    };
  }

  /**
   * Generate daily e-Journal
   */
  static async generateEJournal(storeId: string, date: string, terminalId: string = 'TERMINAL-01'): Promise<BIREJournal | null> {
    try {
      // Get all transactions for the day
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .eq('terminal_id', terminalId)
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`)
        .eq('status', 'completed')
        .order('created_at');

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        return null;
      }

      // Calculate totals
      let grossSales = 0;
      let netSales = 0;
      let vatSales = 0;
      let vatAmount = 0;
      let vatExemptSales = 0;
      let zeroRatedSales = 0;

      transactions.forEach(tx => {
        grossSales += tx.subtotal;
        netSales += tx.total;
        vatSales += (tx.vat_sales || (tx.subtotal - (tx.discount || 0)));
        vatAmount += (tx.tax || 0);
        vatExemptSales += (tx.vat_exempt_sales || 0);
        zeroRatedSales += (tx.zero_rated_sales || 0);
      });

      const journalData = {
        transactions: transactions.map(tx => ({
          receiptNumber: tx.receipt_number,
          sequenceNumber: tx.sequence_number,
          timestamp: tx.created_at,
          gross: tx.subtotal,
          discount: tx.discount,
          net: tx.total,
          vat: tx.tax,
          paymentMethod: tx.payment_method
        })),
        summary: {
          transactionCount: transactions.length,
          grossSales,
          netSales,
          vatSales,
          vatAmount,
          vatExemptSales,
          zeroRatedSales
        }
      };

      // Create or update e-journal entry
      const { data: ejournalData, error: ejournalError } = await supabase
        .from('bir_ejournal')
        .upsert({
          store_id: storeId,
          journal_date: date,
          terminal_id: terminalId,
          journal_data: journalData,
          beginning_receipt: transactions[0].receipt_number,
          ending_receipt: transactions[transactions.length - 1].receipt_number,
          transaction_count: transactions.length,
          gross_sales: grossSales,
          net_sales: netSales,
          vat_sales: vatSales,
          vat_amount: vatAmount,
          vat_exempt_sales: vatExemptSales,
          zero_rated_sales: zeroRatedSales
        }, {
          onConflict: 'store_id,terminal_id,journal_date'
        })
        .select()
        .single();

      if (ejournalError) throw ejournalError;
      return ejournalData as BIREJournal;
    } catch (error) {
      console.error('Error generating e-journal:', error);
      return null;
    }
  }

  /**
   * Check BIR compliance status
   */
  static async checkComplianceStatus(storeId: string): Promise<BIRComplianceStatus> {
    try {
      const { data: store, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;

      const missingFields: string[] = [];
      const warnings: string[] = [];

      // Check required BIR fields
      if (!store.tin) missingFields.push('TIN (Taxpayer Identification Number)');
      if (!store.business_name) missingFields.push('Business Name');
      if (!store.machine_accreditation_number) missingFields.push('Machine Accreditation Number');
      if (!store.machine_serial_number) missingFields.push('Machine Serial Number');
      if (!store.permit_number) missingFields.push('Permit Number');

      // Check dates
      const today = new Date();
      const validUntil = store.valid_until ? new Date(store.valid_until) : null;
      
      if (validUntil && validUntil < today) {
        warnings.push('BIR accreditation has expired');
      } else if (validUntil && (validUntil.getTime() - today.getTime()) < (30 * 24 * 60 * 60 * 1000)) {
        warnings.push('BIR accreditation expires within 30 days');
      }

      const accreditationStatus = store.is_bir_accredited 
        ? (validUntil && validUntil < today ? 'expired' : 'approved')
        : 'pending';

      return {
        isCompliant: missingFields.length === 0 && accreditationStatus === 'approved',
        missingFields,
        warnings,
        accreditationStatus,
        lastAuditDate: store.updated_at,
        nextAuditDate: validUntil?.toISOString()
      };
    } catch (error) {
      console.error('Error checking compliance status:', error);
      return {
        isCompliant: false,
        missingFields: ['Unable to verify compliance'],
        warnings: ['Error checking compliance status'],
        accreditationStatus: 'pending'
      };
    }
  }

  /**
   * Get audit logs for a store
   */
  static async getAuditLogs(
    storeId: string, 
    logType?: string, 
    startDate?: string, 
    endDate?: string,
    limit: number = 100
  ): Promise<BIRAuditLog[]> {
    try {
      let query = supabase
        .from('bir_audit_logs')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (logType) {
        query = query.eq('log_type', logType);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as BIRAuditLog[];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }
}