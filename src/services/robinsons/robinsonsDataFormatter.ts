import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  total: number;
  subtotal: number;
  tax: number;
  vat_amount?: number;
  vat_sales?: number;
  vat_exempt_sales?: number;
  zero_rated_sales?: number;
  discount?: number;  // Database column name
  discount_type?: string;
  senior_discount?: number;
  senior_citizen_discount?: number;
  pwd_discount?: number;
  payment_method: string;
  amount_tendered: number;
  created_at: string;
  receipt_number?: string;
  status?: string;
}

interface Refund {
  id: string;
  refund_amount: number;
  refund_vat_amount?: number;
  refund_date: string;
  refund_receipt_number?: string;
}

interface RobinsonsData {
  tenantId: string;
  posTerminalNo: string;
  salesDate: Date;
  transactions: Transaction[];
  refunds: Refund[];
  previousEODCounter: number;
  previousGrandTotal: number;
  currentEODCounter: number;
}

export class RobinsonsDataFormatter {
  /**
   * Validate that the store is configured for Robinsons accreditation
   */
  async validateRobinsonsStore(storeId: string): Promise<{
    isValid: boolean;
    message: string;
    store?: any;
  }> {
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (error || !store) {
      return {
        isValid: false,
        message: 'Store not found',
      };
    }

    // Check if this is a Robinsons store
    const isRobinsonsStore = store.robinsons_enabled === true || 
                             store.name?.toLowerCase().includes('robinsons');

    if (!isRobinsonsStore) {
      return {
        isValid: false,
        message: 'This store is not configured for Robinsons accreditation. Use SM export for SM stores.',
      };
    }

    // Check if required fields are configured
    if (!store.robinsons_tenant_id) {
      return {
        isValid: false,
        message: 'Robinsons Tenant ID not configured. Please add it in store settings.',
      };
    }

    if (!store.robinsons_sftp_host || !store.robinsons_sftp_username) {
      return {
        isValid: false,
        message: 'Robinsons SFTP credentials not configured. Please add them in store settings.',
      };
    }

    return {
      isValid: true,
      message: 'Store is ready for Robinsons transmission',
      store,
    };
  }

  /**
   * Format a number with zero-padding and decimal places for TXT format
   */
  private formatField(lineNo: number, value: number | string, width: number, decimals?: number): string {
    const linePrefix = lineNo.toString().padStart(2, '0');
    let formattedValue: string;
    
    if (typeof value === 'number' && decimals !== undefined) {
      // Format with decimals: remove decimal point, pad with zeros
      // Example: 12345.67 becomes 000000000001234567 (width 16 + 2 decimals)
      const wholePart = Math.floor(value);
      const decimalPart = Math.round((value - wholePart) * Math.pow(10, decimals));
      const combinedValue = wholePart * Math.pow(10, decimals) + decimalPart;
      formattedValue = combinedValue.toString().padStart(width, '0');
    } else {
      // Format without decimals or string
      formattedValue = value.toString().padStart(width, '0');
    }
    
    return `${linePrefix}${formattedValue}`;
  }

  /**
   * Calculate all required values from transactions
   * RLC COMPLIANCE: Gross sales uses `total` (VAT-inclusive) per RLC requirement
   */
  private calculateValues(transactions: Transaction[], refunds: Refund[]) {
    let grossSales = 0;
    let vatAmount = 0;
    let vatSales = 0;
    let vatExemptSales = 0;
    let zeroRatedSales = 0;
    let totalDiscounts = 0;
    let seniorDiscounts = 0;
    let pwdDiscounts = 0;
    let otherDiscounts = 0;
    let voidAmount = 0;
    let voidCount = 0;
    let refundAmount = 0;
    let refundCount = 0;
    let cashSales = 0;
    let chargeSales = 0;
    let creditCardSales = 0;
    let giftCertificateSales = 0;
    let nonCashTotal = 0;
    let transactionCount = 0;

    transactions.forEach((t) => {
      // Skip voided transactions for gross sales but track void amounts
      if (t.status === 'voided') {
        voidAmount += t.total || 0;
        voidCount++;
        return;
      }

      transactionCount++;
      
      // ✅ RLC COMPLIANCE FIX: Use `total` (VAT-inclusive) for gross sales, not subtotal
      // Per Robinsons Land Corporation requirements, gross sales should be the transaction total
      grossSales += t.total || 0;
      
      // VAT calculations
      vatAmount += t.vat_amount || 0;
      vatSales += t.vat_sales || 0;
      vatExemptSales += t.vat_exempt_sales || 0;
      zeroRatedSales += t.zero_rated_sales || 0;
      
      // Total discount from the discount field
      const txnDiscount = t.discount || 0;
      totalDiscounts += txnDiscount;
      
      // Senior discount - check discount_type first, then fallback to fields
      if (t.discount_type === 'senior') {
        seniorDiscounts += t.senior_citizen_discount || t.senior_discount || txnDiscount || 0;
      } else {
        // May have senior discount amount stored even if type is different
        seniorDiscounts += t.senior_citizen_discount || t.senior_discount || 0;
      }
      
      // PWD discount - check discount_type and pwd_discount field
      if (t.discount_type === 'pwd') {
        pwdDiscounts += t.pwd_discount || txnDiscount || 0;
      } else {
        pwdDiscounts += t.pwd_discount || 0;
      }
      
      // Other discounts (employee, loyalty, regular, custom, promo, etc.)
      const discountTypesOther = ['employee', 'loyalty', 'promo', 'complimentary', 'regular', 'custom', 'athletes_coaches', 'solo_parent'];
      if (t.discount_type && discountTypesOther.includes(t.discount_type)) {
        otherDiscounts += txnDiscount;
      }

      // Payment method breakdown
      const paymentMethod = t.payment_method?.toLowerCase() || 'cash';
      if (paymentMethod === 'cash') {
        cashSales += t.total;
      } else if (paymentMethod === 'credit_card' || paymentMethod === 'card') {
        creditCardSales += t.total;
        nonCashTotal += t.total;
      } else if (paymentMethod === 'gift_certificate' || paymentMethod === 'gift-certificate') {
        giftCertificateSales += t.total;
        nonCashTotal += t.total;
      } else {
        // e-wallet, debit, etc.
        chargeSales += t.total;
        nonCashTotal += t.total;
      }
    });

    // ✅ Process refunds separately
    refunds.forEach((r) => {
      refundAmount += r.refund_amount || 0;
      refundCount++;
    });

    // Net sales = Gross sales - VAT - Discounts - Refunds
    const netSales = grossSales - vatAmount - totalDiscounts - refundAmount;
    const beginningReceiptNumber = transactions[0]?.receipt_number || '0000001';
    const endingReceiptNumber = transactions[transactions.length - 1]?.receipt_number || '0000001';

    return {
      grossSales,
      vatAmount,
      vatSales,
      vatExemptSales,
      zeroRatedSales,
      totalDiscounts,
      seniorDiscounts,
      pwdDiscounts,
      otherDiscounts,
      voidAmount,
      voidCount,
      refundAmount,
      refundCount,
      cashSales,
      chargeSales,
      creditCardSales,
      giftCertificateSales,
      nonCashTotal,
      netSales,
      transactionCount,
      beginningReceiptNumber,
      endingReceiptNumber,
    };
  }

  /**
   * Generate the 30-line TXT format as per Robinsons requirements
   */
  async generate30LineFormat(data: RobinsonsData): Promise<string> {
    const calculations = this.calculateValues(data.transactions, data.refunds);
    
    // Format date as YYYYMMDD
    const salesDateStr = data.salesDate.toISOString().split('T')[0].replace(/-/g, '');
    
    // Calculate accumulated grand total
    const currentGrandTotal = data.previousGrandTotal + calculations.netSales;

    // Generate 30 lines as per specification
    const lines = [
      this.formatField(1, data.tenantId, 10), // Tenant ID
      this.formatField(2, data.posTerminalNo, 2), // POS Terminal Number
      this.formatField(3, calculations.grossSales, 16, 2), // Gross Sales (VAT-inclusive)
      this.formatField(4, calculations.vatAmount, 12, 2), // VAT Amount
      this.formatField(5, calculations.voidAmount, 12, 2), // Void Amount
      this.formatField(6, calculations.voidCount, 6), // Number of Void Transactions
      this.formatField(7, calculations.seniorDiscounts, 12, 2), // Senior Citizen Discount
      this.formatField(8, calculations.pwdDiscounts, 12, 2), // PWD Discount
      this.formatField(9, calculations.otherDiscounts, 12, 2), // Other Discount
      this.formatField(10, calculations.totalDiscounts, 12, 2), // Total Discount
      this.formatField(11, calculations.vatSales, 16, 2), // VAT Sales
      this.formatField(12, calculations.vatExemptSales, 16, 2), // VAT Exempt Sales
      this.formatField(13, calculations.zeroRatedSales, 16, 2), // Zero Rated Sales
      this.formatField(14, calculations.netSales, 16, 2), // Net Sales
      this.formatField(15, calculations.cashSales, 12, 2), // Cash
      this.formatField(16, calculations.chargeSales, 12, 2), // Charge
      this.formatField(17, calculations.creditCardSales, 12, 2), // Credit Card
      this.formatField(18, calculations.giftCertificateSales, 12, 2), // Gift Certificate
      this.formatField(19, 0, 12, 2), // Debit Card (placeholder)
      this.formatField(20, calculations.nonCashTotal, 12, 2), // Non Cash Total
      this.formatField(21, calculations.transactionCount, 10), // Number of Transactions
      this.formatField(22, calculations.beginningReceiptNumber, 10), // Beginning Receipt Number
      this.formatField(23, calculations.endingReceiptNumber, 10), // Ending Receipt Number
      this.formatField(24, salesDateStr, 8), // Date of Transaction (YYYYMMDD)
      this.formatField(25, data.previousEODCounter, 6), // Previous EOD Counter
      this.formatField(26, data.previousGrandTotal, 16, 2), // Previous Grand Total
      this.formatField(27, data.currentEODCounter, 6), // Current EOD Counter
      this.formatField(28, currentGrandTotal, 16, 2), // Current Grand Total
      this.formatField(29, calculations.refundAmount, 12, 2), // Refund Amount
      this.formatField(30, calculations.refundCount, 6), // Number of Refund Transactions
    ];
    
    return lines.join('\n');
  }

  /**
   * Fetch transactions for a specific store and date
   */
  async fetchTransactions(storeId: string, salesDate: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${salesDate}T00:00:00`)
      .lt('created_at', `${salesDate}T23:59:59`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    return data as Transaction[];
  }

  /**
   * Fetch refunds for a specific store and date
   */
  async fetchRefunds(storeId: string, salesDate: string): Promise<Refund[]> {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('store_id', storeId)
      .gte('refund_date', `${salesDate}T00:00:00`)
      .lt('refund_date', `${salesDate}T23:59:59`)
      .order('refund_date', { ascending: true });

    if (error) {
      console.error('Error fetching refunds:', error);
      // Don't throw - refunds might not exist for this date
      return [];
    }

    return data as Refund[];
  }

  /**
   * Get the previous grand total from the last successful transmission
   */
  async getPreviousGrandTotal(storeId: string): Promise<number> {
    const { data, error } = await supabase
      .from('robinsons_transmission_log')
      .select('file_content')
      .eq('store_id', storeId)
      .eq('status', 'success')
      .order('transmission_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return 0;
    }

    // Extract line 28 (Current Grand Total from previous transmission)
    const lines = data.file_content.split('\n');
    if (lines.length >= 28) {
      const line28 = lines[27]; // 0-indexed, so line 28 is index 27
      // Remove line number prefix and parse the value
      const valueStr = line28.substring(2);
      return parseFloat(valueStr) / 100; // Convert back from fixed-point
    }

    return 0;
  }
}
