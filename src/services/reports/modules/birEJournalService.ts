import { supabase } from "@/integrations/supabase/client";
import { BIRComplianceService } from "@/services/bir/birComplianceService";
import { format } from "date-fns";

export interface EJournalData {
  storeId: string;
  terminalId: string;
  journalDate: string;
  beginningReceiptNumber: string;
  endingReceiptNumber: string;
  transactionCount: number;
  grossSales: number;
  netSales: number;
  vatSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  totalDiscounts: number;
  seniorDiscounts: number;
  pwdDiscounts: number;
  transactions: EJournalTransaction[];
}

export interface EJournalTransaction {
  receiptNumber: string;
  sequenceNumber: number;
  timestamp: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  vatAmount: number;
  vatableSales: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  paymentMethod: string;
  discountType?: string;
  customerType?: string;
}

export class BIREJournalService {
  /**
   * Generate BIR-compliant e-Journal for a specific date
   */
  static async generateEJournal(
    storeId: string, 
    date: string, 
    terminalId: string = 'TERMINAL-01'
  ): Promise<EJournalData | null> {
    try {
      // Get all transactions for the date
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customers (
            name
          )
        `)
        .eq('store_id', storeId)
        .eq('terminal_id', terminalId)
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`)
        .eq('status', 'completed')
        .order('sequence_number');

      if (error) throw error;
      if (!transactions || transactions.length === 0) return null;

      // Calculate totals
      let grossSales = 0;
      let netSales = 0;
      let vatSales = 0;
      let vatAmount = 0;
      let vatExemptSales = 0;
      let zeroRatedSales = 0;
      let totalDiscounts = 0;
      let seniorDiscounts = 0;
      let pwdDiscounts = 0;

      const ejournalTransactions: EJournalTransaction[] = transactions.map(tx => {
        const grossAmount = tx.subtotal;
        const discountAmount = tx.discount || 0;
        const netAmount = tx.total;
        const vatAmountTx = tx.tax || 0;
        const vatableSalesTx = tx.vat_sales || (grossAmount - discountAmount);
        const vatExemptSalesTx = tx.vat_exempt_sales || 0;
        const zeroRatedSalesTx = tx.zero_rated_sales || 0;

        // Accumulate totals
        grossSales += grossAmount;
        netSales += netAmount;
        vatSales += vatableSalesTx;
        vatAmount += vatAmountTx;
        vatExemptSales += vatExemptSalesTx;
        zeroRatedSales += zeroRatedSalesTx;
        totalDiscounts += discountAmount;

        if (tx.discount_type === 'senior') {
          seniorDiscounts += discountAmount;
        } else if (tx.discount_type === 'pwd') {
          pwdDiscounts += discountAmount;
        }

        return {
          receiptNumber: tx.receipt_number,
          sequenceNumber: tx.sequence_number || 0,
          timestamp: tx.created_at,
          grossAmount,
          discountAmount,
          netAmount,
          vatAmount: vatAmountTx,
          vatableSales: vatableSalesTx,
          vatExemptSales: vatExemptSalesTx,
          zeroRatedSales: zeroRatedSalesTx,
          paymentMethod: tx.payment_method,
          discountType: tx.discount_type,
          customerType: tx.discount_type ? 
            (tx.discount_type === 'senior' ? 'Senior Citizen' : 
             tx.discount_type === 'pwd' ? 'PWD' : 'Regular') : 'Regular'
        };
      });

      const receiptNumbers = transactions.map(tx => tx.receipt_number).sort();

      return {
        storeId,
        terminalId,
        journalDate: date,
        beginningReceiptNumber: receiptNumbers[0],
        endingReceiptNumber: receiptNumbers[receiptNumbers.length - 1],
        transactionCount: transactions.length,
        grossSales,
        netSales,
        vatSales,
        vatAmount,
        vatExemptSales,
        zeroRatedSales,
        totalDiscounts,
        seniorDiscounts,
        pwdDiscounts,
        transactions: ejournalTransactions
      };
    } catch (error) {
      console.error('Error generating e-Journal:', error);
      return null;
    }
  }

  /**
   * Export e-Journal as JSON
   */
  static exportAsJSON(ejournalData: EJournalData): string {
    const exportData = {
      header: {
        storeId: ejournalData.storeId,
        terminalId: ejournalData.terminalId,
        journalDate: ejournalData.journalDate,
        generatedAt: new Date().toISOString(),
        beginningReceipt: ejournalData.beginningReceiptNumber,
        endingReceipt: ejournalData.endingReceiptNumber,
        transactionCount: ejournalData.transactionCount
      },
      summary: {
        grossSales: ejournalData.grossSales,
        netSales: ejournalData.netSales,
        vatableSales: ejournalData.vatSales,
        vatAmount: ejournalData.vatAmount,
        vatExemptSales: ejournalData.vatExemptSales,
        zeroRatedSales: ejournalData.zeroRatedSales,
        totalDiscounts: ejournalData.totalDiscounts,
        seniorDiscounts: ejournalData.seniorDiscounts,
        pwdDiscounts: ejournalData.pwdDiscounts
      },
      transactions: ejournalData.transactions
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Download e-Journal as JSON file
   */
  static downloadJSON(ejournalData: EJournalData): void {
    const jsonData = this.exportAsJSON(ejournalData);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ejournal_${ejournalData.storeId}_${ejournalData.journalDate}_${ejournalData.terminalId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate BIR data backup for a date range
   */
  static async generateDataBackup(
    storeId: string, 
    startDate: string, 
    endDate: string
  ): Promise<any> {
    try {
      // Get store information
      const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      // Get all transactions in range
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .eq('status', 'completed')
        .order('created_at');

      // Get cumulative sales data
      const cumulativeSales = await BIRComplianceService.getCumulativeSales(storeId);

      // Get audit logs
      const auditLogs = await BIRComplianceService.getAuditLogs(
        storeId, 
        undefined, 
        `${startDate}T00:00:00`, 
        `${endDate}T23:59:59`,
        1000
      );

      return {
        storeInfo: store,
        dateRange: { startDate, endDate },
        transactionData: transactions || [],
        cumulativeSales,
        auditTrail: auditLogs,
        generatedAt: new Date().toISOString(),
        birCompliance: {
          nonResettableGrandTotal: cumulativeSales?.grandTotalSales || 0,
          totalTransactions: cumulativeSales?.grandTotalTransactions || 0,
          lastTransactionDate: cumulativeSales?.lastTransactionDate,
          lastReceiptNumber: cumulativeSales?.lastReceiptNumber
        }
      };
    } catch (error) {
      console.error('Error generating data backup:', error);
      throw error;
    }
  }

  /**
   * Download data backup as JSON file
   */
  static downloadDataBackup(backupData: any, storeId: string, startDate: string, endDate: string): void {
    const jsonData = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `bir_backup_${storeId}_${startDate}_to_${endDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}