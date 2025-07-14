import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface TransactionCSVRow {
  receipt_number: string;
  business_date: string;
  transaction_time: string;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  vat_amount: number;
  payment_method: string;
  discount_type: string;
  discount_id: string;
  promo_details: string;
  senior_discount: number;
  pwd_discount: number;
}

export interface TransactionDetailsCSVRow {
  receipt_number: string;
  item_sequence: number;
  item_description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  item_discount: number;
  vat_exempt_flag: boolean;
}

export class SMAccreditationService {
  
  /**
   * Export transactions for the last 30 days in SM Accreditation format
   */
  async exportTransactionsCSV(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('export_transactions_csv');
      
      if (error) {
        console.error('Error exporting transactions:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return this.createEmptyTransactionsCSV();
      }

      return this.formatTransactionsCSV(data);
    } catch (error) {
      console.error('SM Accreditation export error:', error);
      throw error;
    }
  }

  /**
   * Export transaction details for the last 30 days in SM Accreditation format
   */
  async exportTransactionDetailsCSV(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('export_transaction_details_csv');
      
      if (error) {
        console.error('Error exporting transaction details:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return this.createEmptyTransactionDetailsCSV();
      }

      return this.formatTransactionDetailsCSV(data);
    } catch (error) {
      console.error('SM Accreditation transaction details export error:', error);
      throw error;
    }
  }

  /**
   * Generate both CSV files and return as an object
   */
  async generateCSVFiles(): Promise<{
    transactions: string;
    transactionDetails: string;
    filename: string;
  }> {
    const now = new Date();
    const filename = format(now, 'MM_yyyy');
    
    const [transactions, transactionDetails] = await Promise.all([
      this.exportTransactionsCSV(),
      this.exportTransactionDetailsCSV()
    ]);

    return {
      transactions,
      transactionDetails,
      filename
    };
  }

  /**
   * Save CSV files to specified directory (C:\SIA or /opt/sia)
   */
  async saveCSVFiles(): Promise<{
    transactionsPath: string;
    detailsPath: string;
  }> {
    const { transactions, transactionDetails, filename } = await this.generateCSVFiles();
    
    // For web environment, we'll return the CSV content with intended paths
    // In a desktop environment, this would actually save to filesystem
    const baseDir = this.getSIADirectory();
    
    return {
      transactionsPath: `${baseDir}/${filename}_transactions.csv`,
      detailsPath: `${baseDir}/${filename}_transactiondetails.csv`
    };
  }

  private formatTransactionsCSV(data: TransactionCSVRow[]): string {
    const headers = [
      'receipt_number',
      'business_date', 
      'transaction_time',
      'gross_amount',
      'discount_amount',
      'net_amount',
      'vat_amount',
      'payment_method',
      'discount_type',
      'discount_id',
      'promo_details',
      'senior_discount',
      'pwd_discount'
    ];

    const csvRows = [
      headers.join(','),
      ...data.map(row => [
        this.escapeCSV(row.receipt_number),
        this.escapeCSV(row.business_date),
        this.escapeCSV(row.transaction_time),
        row.gross_amount || 0,
        row.discount_amount || 0,
        row.net_amount || 0,
        row.vat_amount || 0,
        this.escapeCSV(row.payment_method),
        this.escapeCSV(row.discount_type || ''),
        this.escapeCSV(row.discount_id || ''),
        this.escapeCSV(row.promo_details || ''),
        row.senior_discount || 0,
        row.pwd_discount || 0
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  private formatTransactionDetailsCSV(data: TransactionDetailsCSVRow[]): string {
    const headers = [
      'receipt_number',
      'item_sequence',
      'item_description',
      'quantity',
      'unit_price',
      'line_total',
      'item_discount',
      'vat_exempt_flag'
    ];

    const csvRows = [
      headers.join(','),
      ...data.map(row => [
        this.escapeCSV(row.receipt_number),
        row.item_sequence,
        this.escapeCSV(row.item_description),
        row.quantity,
        row.unit_price || 0,
        row.line_total || 0,
        row.item_discount || 0,
        row.vat_exempt_flag ? 'true' : 'false'
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  private createEmptyTransactionsCSV(): string {
    return [
      'receipt_number,business_date,transaction_time,gross_amount,discount_amount,net_amount,vat_amount,payment_method,discount_type,discount_id,promo_details,senior_discount,pwd_discount'
    ].join('\n');
  }

  private createEmptyTransactionDetailsCSV(): string {
    return [
      'receipt_number,item_sequence,item_description,quantity,unit_price,line_total,item_discount,vat_exempt_flag'
    ].join('\n');
  }

  private escapeCSV(value: string | null | undefined): string {
    if (!value) return '';
    
    const stringValue = String(value);
    
    // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  private getSIADirectory(): string {
    // In browser environment, return a virtual path
    // In actual deployment, this would be C:\SIA on Windows or /opt/sia on Linux
    return typeof window !== 'undefined' ? '/virtual/sia' : '/opt/sia';
  }

  /**
   * Format promo details according to SM requirements: [promo_ref]=[promo_name]
   * Multiple promos separated by ::
   */
  static formatPromoDetails(promos: Array<{ref: string, name: string}>): string {
    if (!promos || promos.length === 0) return '';
    
    return promos
      .map(promo => `${promo.ref}=${promo.name}`)
      .join('::');
  }

  /**
   * Parse promo details from formatted string
   */
  static parsePromoDetails(promoDetails: string): Array<{ref: string, name: string}> {
    if (!promoDetails) return [];
    
    return promoDetails
      .split('::')
      .map(promo => {
        const [ref, name] = promo.split('=');
        return { ref: ref || '', name: name || '' };
      })
      .filter(promo => promo.ref && promo.name);
  }
}