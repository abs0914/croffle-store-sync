import { supabase } from "@/integrations/supabase/client";
import { format, subDays, addHours } from "date-fns";
import { toast } from "sonner";

export interface SampleTransactionData {
  storeId: string;
  userId: string;
  shiftId: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty';
  discountIdNumber?: string;
  total: number;
  amountTendered: number;
  change: number;
  paymentMethod: 'cash' | 'card' | 'e-wallet';
  customerType: 'regular' | 'senior' | 'pwd';
}

export class BIRSampleDataService {
  /**
   * Generate realistic sample transactions for BIR testing
   */
  static async generateSampleTransactions(
    storeId: string, 
    dateRange: { from: Date; to: Date },
    transactionsPerDay: number = 15
  ): Promise<boolean> {
    try {
      const transactions: any[] = [];
      let currentDate = new Date(dateRange.from);
      let sequenceNumber = 1;
      
      // Common menu items with realistic prices
      const menuItems = [
        { name: 'Regular Croffle', price: 85, cost: 35 },
        { name: 'Chocolate Croffle', price: 95, cost: 40 },
        { name: 'Strawberry Croffle', price: 95, cost: 40 },
        { name: 'Ice Cream Croffle', price: 120, cost: 50 },
        { name: 'Coffee', price: 65, cost: 25 },
        { name: 'Iced Tea', price: 45, cost: 15 },
        { name: 'Milk Tea', price: 85, cost: 35 },
        { name: 'Frappe', price: 105, cost: 45 }
      ];

      while (currentDate <= dateRange.to) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Generate transactions throughout the day
        for (let i = 0; i < transactionsPerDay; i++) {
          // Random time during business hours (8 AM - 10 PM)
          const hour = 8 + Math.floor(Math.random() * 14);
          const minute = Math.floor(Math.random() * 60);
          const transactionTime = addHours(new Date(currentDate), hour);
          transactionTime.setMinutes(minute);
          
          // Generate receipt number
          const receiptNumber = `${format(currentDate, 'yyyyMMdd')}-${String(sequenceNumber).padStart(4, '0')}-${format(transactionTime, 'HHmmss')}`;
          
          // Random number of items (1-4)
          const itemCount = 1 + Math.floor(Math.random() * 4);
          const items = [];
          let subtotal = 0;
          
          for (let j = 0; j < itemCount; j++) {
            const item = menuItems[Math.floor(Math.random() * menuItems.length)];
            const quantity = 1 + Math.floor(Math.random() * 3);
            const totalPrice = item.price * quantity;
            
            items.push({
              productId: `product_${j + 1}`,
              variationId: null,
              name: item.name,
              quantity,
              unitPrice: item.price,
              totalPrice
            });
            
            subtotal += totalPrice;
          }
          
          // Determine customer type and discount
          let discountType: string | null = null;
          let discountAmount = 0;
          let discountIdNumber: string | null = null;
          
          const customerTypeRandom = Math.random();
          if (customerTypeRandom < 0.1) { // 10% senior citizens
            discountType = 'senior';
            discountAmount = subtotal * 0.12; // 12% senior discount
            discountIdNumber = `SC${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
          } else if (customerTypeRandom < 0.15) { // 5% PWD
            discountType = 'pwd';
            discountAmount = subtotal * 0.12; // 12% PWD discount  
            discountIdNumber = `PWD${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
          } else if (customerTypeRandom < 0.18) { // 3% employee discount
            discountType = 'employee';
            discountAmount = subtotal * 0.10; // 10% employee discount
          }
          
          // Calculate final amounts
          const netAmount = subtotal - discountAmount;
          const vatableSales = netAmount / 1.12; // Amount before 12% VAT
          const vatAmount = netAmount - vatableSales; // 12% VAT
          const vatExemptSales = (discountType === 'senior' || discountType === 'pwd') ? discountAmount : 0;
          
          // Payment method distribution
          const paymentRandom = Math.random();
          let paymentMethod: 'cash' | 'card' | 'e-wallet';
          if (paymentRandom < 0.6) {
            paymentMethod = 'cash';
          } else if (paymentRandom < 0.85) {
            paymentMethod = 'card';
          } else {
            paymentMethod = 'e-wallet';
          }
          
          // Calculate change for cash payments
          let amountTendered = netAmount;
          let change = 0;
          if (paymentMethod === 'cash') {
            // Round up to nearest 5 or 10 peso bill
            amountTendered = Math.ceil(netAmount / 10) * 10;
            change = amountTendered - netAmount;
          }
          
          const transaction = {
            shift_id: 'sample_shift',
            store_id: storeId,
            user_id: 'sample_user',
            customer_id: null,
            items: JSON.stringify(items),
            subtotal,
            tax: vatAmount,
            discount: discountAmount,
            discount_type: discountType,
            discount_id_number: discountIdNumber,
            total: netAmount,
            amount_tendered: amountTendered,
            change: change,
            payment_method: paymentMethod,
            payment_details: null,
            status: 'completed',
            receipt_number: receiptNumber,
            created_at: transactionTime.toISOString(),
            // BIR Compliance fields
            vat_sales: vatableSales,
            vat_exempt_sales: vatExemptSales,
            zero_rated_sales: 0,
            senior_citizen_discount: discountType === 'senior' ? discountAmount : 0,
            pwd_discount: discountType === 'pwd' ? discountAmount : 0,
            sequence_number: sequenceNumber,
            terminal_id: 'TERMINAL-01'
          };
          
          transactions.push(transaction);
          sequenceNumber++;
        }
        
        // Move to next day
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Insert transactions in batches
      const batchSize = 50;
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        const { error } = await supabase
          .from('transactions')
          .insert(batch);
          
        if (error) {
          console.error('Error inserting transaction batch:', error);
          throw error;
        }
      }
      
      toast.success(`Generated ${transactions.length} sample transactions for BIR testing`);
      return true;
      
    } catch (error) {
      console.error('Error generating sample transactions:', error);
      toast.error('Failed to generate sample transactions');
      return false;
    }
  }

  /**
   * Clear all sample transactions for a store
   */
  static async clearSampleTransactions(storeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('store_id', storeId)
        .eq('user_id', 'sample_user');
        
      if (error) throw error;
      
      toast.success('Sample transactions cleared');
      return true;
    } catch (error) {
      console.error('Error clearing sample transactions:', error);
      toast.error('Failed to clear sample transactions');
      return false;
    }
  }

  /**
   * Generate sample data for the last 30 days
   */
  static async generateLast30Days(storeId: string): Promise<boolean> {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    
    return this.generateSampleTransactions(
      storeId,
      { from: thirtyDaysAgo, to: today },
      Math.floor(Math.random() * 10) + 10 // 10-19 transactions per day
    );
  }

  /**
   * Validate BIR data integrity
   */
  static async validateBIRDataIntegrity(storeId: string): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      
      const issues: string[] = [];
      const recommendations: string[] = [];
      
      if (!transactions || transactions.length === 0) {
        issues.push('No transactions found for analysis');
        recommendations.push('Generate sample transactions for testing');
        return { isValid: false, issues, recommendations };
      }
      
      // Check for missing BIR fields
      const missingVATSales = transactions.filter(tx => !tx.vat_sales);
      const missingSequenceNumbers = transactions.filter(tx => !tx.sequence_number);
      const missingTerminalId = transactions.filter(tx => !tx.terminal_id);
      
      if (missingVATSales.length > 0) {
        issues.push(`${missingVATSales.length} transactions missing VAT sales calculation`);
        recommendations.push('Update transaction creation to include proper VAT calculations');
      }
      
      if (missingSequenceNumbers.length > 0) {
        issues.push(`${missingSequenceNumbers.length} transactions missing sequence numbers`);
        recommendations.push('Implement sequential numbering for all transactions');
      }
      
      if (missingTerminalId.length > 0) {
        issues.push(`${missingTerminalId.length} transactions missing terminal ID`);
        recommendations.push('Ensure all transactions include terminal identification');
      }
      
      // Validate VAT calculations
      const invalidVATCalculations = transactions.filter(tx => {
        if (!tx.vat_sales || !tx.tax) return false;
        const expectedVAT = tx.vat_sales * 0.12;
        const difference = Math.abs(tx.tax - expectedVAT);
        return difference > 0.01; // Allow 1 centavo tolerance
      });
      
      if (invalidVATCalculations.length > 0) {
        issues.push(`${invalidVATCalculations.length} transactions have incorrect VAT calculations`);
        recommendations.push('Review VAT calculation logic to ensure 12% rate is properly applied');
      }
      
      // Check receipt number format
      const invalidReceiptNumbers = transactions.filter(tx => {
        return !tx.receipt_number || !/^\d{8}-\d{4}-\d{6}$/.test(tx.receipt_number);
      });
      
      if (invalidReceiptNumbers.length > 0) {
        issues.push(`${invalidReceiptNumbers.length} transactions have invalid receipt number format`);
        recommendations.push('Standardize receipt numbers to YYYYMMDD-NNNN-HHMMSS format');
      }
      
      const isValid = issues.length === 0;
      
      if (isValid) {
        recommendations.push('BIR data integrity looks good - ready for compliance reporting');
      }
      
      return { isValid, issues, recommendations };
      
    } catch (error) {
      console.error('Error validating BIR data integrity:', error);
      return {
        isValid: false,
        issues: ['Error during data integrity check'],
        recommendations: ['Check database connectivity and try again']
      };
    }
  }
}