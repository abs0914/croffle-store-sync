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
    terminalId?: string
  ): Promise<EJournalData | null> {
    try {
      console.log('📋 E-Journal query params:', { storeId, date, terminalId });
      
      // Build query - terminal_id filter is optional
      let query = supabase
        .from('transactions')
        .select(`
          *,
          customers (
            name
          )
        `)
        .eq('store_id', storeId)
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`)
        .eq('status', 'completed')
        .order('sequence_number');
      
      // Only filter by terminal_id if explicitly provided
      if (terminalId) {
        query = query.eq('terminal_id', terminalId);
      }
      
      const { data: transactions, error } = await query;

      console.log('📋 E-Journal query result:', { 
        count: transactions?.length || 0, 
        error: error?.message 
      });

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
        // Calculate grossAmount with fallbacks for missing subtotal
        let grossAmount = tx.subtotal;
        if (!grossAmount || grossAmount <= 0) {
          const itemsTotal = (tx.items as any[])?.reduce((sum: number, item: any) => 
            sum + ((item.quantity || 1) * (item.unitPrice || item.unit_price || 0)), 0) || 0;
          grossAmount = itemsTotal || ((tx.total || 0) + (tx.discount || 0));
        }
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
   * Export e-Journal as TXT (BIR-compliant plain text format)
   */
  static exportAsTXT(ejournalData: EJournalData, storeName: string = '', storeAddress: string = '', tin: string = ''): string {
    const lines: string[] = [];
    const separator = '='.repeat(60);
    const thinSeparator = '-'.repeat(60);
    
    // Header
    lines.push(separator);
    lines.push('                    BIR ELECTRONIC JOURNAL');
    lines.push(separator);
    lines.push('');
    lines.push(`STORE NAME      : ${storeName}`);
    lines.push(`ADDRESS         : ${storeAddress}`);
    lines.push(`TIN             : ${tin}`);
    lines.push(`TERMINAL ID     : ${ejournalData.terminalId}`);
    lines.push(`JOURNAL DATE    : ${ejournalData.journalDate}`);
    lines.push(`GENERATED AT    : ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
    lines.push('');
    lines.push(thinSeparator);
    lines.push('                    TRANSACTION SUMMARY');
    lines.push(thinSeparator);
    lines.push(`BEGINNING SI NO : ${ejournalData.beginningReceiptNumber}`);
    lines.push(`ENDING SI NO    : ${ejournalData.endingReceiptNumber}`);
    lines.push(`TOTAL TRANS     : ${ejournalData.transactionCount}`);
    lines.push('');
    lines.push(thinSeparator);
    lines.push('                      SALES SUMMARY');
    lines.push(thinSeparator);
    lines.push(`GROSS SALES     : ${ejournalData.grossSales.toFixed(2).padStart(15)}`);
    lines.push(`LESS: DISCOUNTS : ${ejournalData.totalDiscounts.toFixed(2).padStart(15)}`);
    lines.push(`NET SALES       : ${ejournalData.netSales.toFixed(2).padStart(15)}`);
    lines.push('');
    lines.push(thinSeparator);
    lines.push('                      VAT ANALYSIS');
    lines.push(thinSeparator);
    lines.push(`VATABLE SALES   : ${ejournalData.vatSales.toFixed(2).padStart(15)}`);
    lines.push(`VAT AMOUNT      : ${ejournalData.vatAmount.toFixed(2).padStart(15)}`);
    lines.push(`VAT EXEMPT      : ${ejournalData.vatExemptSales.toFixed(2).padStart(15)}`);
    lines.push(`ZERO-RATED      : ${ejournalData.zeroRatedSales.toFixed(2).padStart(15)}`);
    lines.push('');
    lines.push(thinSeparator);
    lines.push('                    DISCOUNT BREAKDOWN');
    lines.push(thinSeparator);
    lines.push(`SENIOR CITIZEN  : ${ejournalData.seniorDiscounts.toFixed(2).padStart(15)}`);
    lines.push(`PWD             : ${ejournalData.pwdDiscounts.toFixed(2).padStart(15)}`);
    lines.push(`OTHER DISCOUNTS : ${(ejournalData.totalDiscounts - ejournalData.seniorDiscounts - ejournalData.pwdDiscounts).toFixed(2).padStart(15)}`);
    lines.push('');
    lines.push(separator);
    lines.push('                   TRANSACTION DETAILS');
    lines.push(separator);
    lines.push('');
    
    // Transaction details header
    lines.push('SI NO.          SEQ   GROSS      DISC       NET        VAT      PAYMENT');
    lines.push(thinSeparator);
    
    // Transaction rows
    ejournalData.transactions.forEach(tx => {
      const siNo = tx.receiptNumber.padEnd(16);
      const seq = tx.sequenceNumber.toString().padStart(4);
      const gross = tx.grossAmount.toFixed(2).padStart(10);
      const disc = tx.discountAmount.toFixed(2).padStart(10);
      const net = tx.netAmount.toFixed(2).padStart(10);
      const vat = tx.vatAmount.toFixed(2).padStart(10);
      const payment = tx.paymentMethod.substring(0, 8).padEnd(8);
      
      lines.push(`${siNo}${seq}${gross}${disc}${net}${vat}  ${payment}`);
      
      // Add discount info if applicable
      if (tx.discountAmount > 0 && tx.discountType) {
        lines.push(`                      ** ${tx.customerType} DISCOUNT **`);
      }
    });
    
    lines.push(thinSeparator);
    
    // Totals row
    const totalGross = ejournalData.grossSales.toFixed(2).padStart(10);
    const totalDisc = ejournalData.totalDiscounts.toFixed(2).padStart(10);
    const totalNet = ejournalData.netSales.toFixed(2).padStart(10);
    const totalVat = ejournalData.vatAmount.toFixed(2).padStart(10);
    lines.push(`TOTALS:              ${totalGross}${totalDisc}${totalNet}${totalVat}`);
    
    lines.push('');
    lines.push(separator);
    lines.push('                    END OF E-JOURNAL');
    lines.push(separator);
    lines.push('');
    lines.push('This is a BIR-compliant electronic journal.');
    lines.push('Keep this record for at least 10 years.');
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Download e-Journal as TXT file
   */
  static downloadTXT(ejournalData: EJournalData, storeName: string = '', storeAddress: string = '', tin: string = ''): void {
    const txtData = this.exportAsTXT(ejournalData, storeName, storeAddress, tin);
    const blob = new Blob([txtData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ejournal_${ejournalData.storeId}_${ejournalData.journalDate}_${ejournalData.terminalId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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