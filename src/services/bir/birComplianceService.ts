import { supabase } from "@/integrations/supabase/client";

/**
 * BIR Compliance Service for audit logging
 * Handles BIR-required transaction and system audit logging
 */
export class BirComplianceService {
  /**
   * Log audit event with BIR compliance
   */
  static async logAuditEvent(
    storeId: string,
    logType: string,
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

      if (error) {
        console.error('Error logging BIR audit event:', error);
        // Don't throw error - make BIR audit logging optional to prevent transaction failures
        return null;
      }

      return data;
    } catch (error) {
      console.error('BIR audit logging failed:', error);
      // Return null instead of throwing to prevent transaction failures
      return null;
    }
  }

  /**
   * Log transaction completion for BIR compliance
   */
  static async logTransactionComplete(
    storeId: string,
    transactionId: string,
    receiptNumber: string,
    transactionData: Record<string, any>,
    userId?: string,
    cashierName?: string
  ): Promise<void> {
    await this.logAuditEvent(
      storeId,
      'transaction',
      'transaction_completed',
      transactionData,
      userId,
      cashierName,
      'TERMINAL-01',
      transactionId,
      receiptNumber
    );
  }

  /**
   * Log system events for BIR compliance
   */
  static async logSystemEvent(
    storeId: string,
    eventName: string,
    eventData: Record<string, any>,
    userId?: string
  ): Promise<void> {
    await this.logAuditEvent(
      storeId,
      'system',
      eventName,
      eventData,
      userId
    );
  }

  /**
   * Check BIR compliance status for a store
   */
  static async checkComplianceStatus(storeId: string): Promise<{
    isCompliant: boolean;
    missingRequirements: string[];
    lastAuditDate?: string;
  }> {
    try {
      // Get store information
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('tin, business_name, permit_number, date_issued, valid_until, is_bir_accredited')
        .eq('id', storeId)
        .single();

      if (storeError || !store) {
        return {
          isCompliant: false,
          missingRequirements: ['Store not found']
        };
      }

      const missingRequirements: string[] = [];
      
      if (!store.tin) missingRequirements.push('TIN');
      if (!store.business_name) missingRequirements.push('Business Name');
      if (!store.permit_number) missingRequirements.push('Permit Number');
      if (!store.date_issued) missingRequirements.push('Date Issued');
      if (!store.valid_until) missingRequirements.push('Valid Until Date');
      if (!store.is_bir_accredited) missingRequirements.push('BIR Accreditation');

      // Check if permit is still valid
      if (store.valid_until && new Date(store.valid_until) < new Date()) {
        missingRequirements.push('Valid permit (expired)');
      }

      return {
        isCompliant: missingRequirements.length === 0,
        missingRequirements
      };
    } catch (error) {
      console.error('Error checking compliance status:', error);
      return {
        isCompliant: false,
        missingRequirements: ['Error checking compliance']
      };
    }
  }

  /**
   * Get audit logs for BIR compliance
   */
  static async getAuditLogs(
    storeId: string,
    logType?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('bir_audit_logs')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (logType) {
        query = query.eq('log_type', logType);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }

  /**
   * Get cumulative sales data for BIR compliance
   */
  static async getCumulativeSales(storeId: string): Promise<{
    grandTotalSales: number;
    grandTotalTransactions: number;
    lastTransactionDate?: string;
    lastReceiptNumber?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('bir_cumulative_sales')
        .select('*')
        .eq('store_id', storeId)
        .single();

      if (error || !data) {
        return {
          grandTotalSales: 0,
          grandTotalTransactions: 0
        };
      }

      return {
        grandTotalSales: data.grand_total_sales || 0,
        grandTotalTransactions: data.grand_total_transactions || 0,
        lastTransactionDate: data.last_transaction_date,
        lastReceiptNumber: data.last_receipt_number
      };
    } catch (error) {
      console.error('Error getting cumulative sales:', error);
      return {
        grandTotalSales: 0,
        grandTotalTransactions: 0
      };
    }
  }

  /**
   * Generate E-Journal for BIR compliance
   */
  static async generateEJournal(
    storeId: string,
    date: string,
    terminalId: string = 'TERMINAL-01'
  ): Promise<any | null> {
    try {
      // Get transactions for the date
      const startDate = `${date}T00:00:00`;
      const endDate = `${date}T23:59:59`;

      // Get transactions for the date using improved query
      const startTime = `${date}T00:00:00.000Z`;
      const endTime = `${date}T23:59:59.999Z`;
      
      console.log(`🔍 BIR E-Journal querying: ${startTime} to ${endTime} for store ${storeId.slice(0, 8)}`);

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .gte('created_at', startTime)
        .lte('created_at', endTime)
        .eq('status', 'completed')
        .order('created_at');

      // Only add terminal filter if explicitly provided and not default
      if (terminalId && terminalId !== 'TERMINAL-01') {
        query = query.eq('terminal_id', terminalId);
        console.log(`🖥️ Terminal filter applied: ${terminalId}`);
      }

      const { data: transactions, error } = await query;

      if (error) {
        console.error('❌ BIR E-Journal transaction query error:', error);
        return null;
      }

      console.log(`✅ BIR E-Journal found ${transactions?.length || 0} transactions`);

      if (!transactions || transactions.length === 0) {
        console.log('❌ No transactions found for e-journal');
        return null;
      }

      // Calculate totals
      const grossSales = transactions.reduce((sum, tx) => sum + (tx.subtotal || 0), 0);
      const netSales = transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
      const vatSales = transactions.reduce((sum, tx) => sum + (tx.tax || 0), 0);

      return {
        journalDate: date,
        terminalId,
        storeId,
        transactionCount: transactions.length,
        grossSales,
        netSales,
        vatSales,
        beginningReceipt: transactions[0]?.receipt_number,
        endingReceipt: transactions[transactions.length - 1]?.receipt_number,
        transactions: transactions.map(tx => ({
          receiptNumber: tx.receipt_number,
          timestamp: tx.created_at,
          total: tx.total,
          subtotal: tx.subtotal,
          tax: tx.tax,
          discount: tx.discount,
          paymentMethod: tx.payment_method
        }))
      };
    } catch (error) {
      console.error('Error generating e-journal:', error);
      return null;
    }
  }
}

// Legacy exports for backward compatibility
export const logAuditEvent = BirComplianceService.logAuditEvent;
export const logTransactionComplete = BirComplianceService.logTransactionComplete;
export const logSystemEvent = BirComplianceService.logSystemEvent;

// Export with both naming conventions for compatibility
export { BirComplianceService as BIRComplianceService };