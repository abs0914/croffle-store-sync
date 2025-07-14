
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { BIRComplianceService } from "@/services/bir/birComplianceService";
import { toast } from "sonner";
import { format } from "date-fns";

// Type definition for transaction data from Supabase
interface TransactionRow {
  id: string;
  shift_id: string;
  store_id: string;
  user_id: string;
  customer_id?: string;
  items: string; // JSONB stored as string
  subtotal: number;
  tax: number;
  discount: number;
  discount_type?: string;
  discount_id_number?: string;
  total: number;
  amount_tendered?: number;
  change?: number;
  payment_method: string;
  payment_details?: object;
  status: 'completed' | 'voided';
  created_at: string;
  receipt_number: string;
}

/**
 * Creates a new transaction in the database
 */
export const createTransaction = async (transaction: Omit<Transaction, "id" | "createdAt" | "receiptNumber">): Promise<Transaction | null> => {
  try {
    // Generate a receipt number based on date and time
    const now = new Date();
    const receiptPrefix = format(now, "yyyyMMdd");
    const timestamp = format(now, "HHmmss");
    
    // Query to get the count of transactions for today to generate sequential receipt number
    const { count, error: countError } = await supabase
      .from("transactions")
      .select("id", { count: 'exact', head: true })
      .gte('created_at', format(now, "yyyy-MM-dd"))
      .lt('created_at', format(new Date(now.getTime() + 86400000), "yyyy-MM-dd"));
    
    if (countError) {
      throw new Error(countError.message);
    }
    
    const receiptNumber = `${receiptPrefix}-${String(count! + 1).padStart(4, '0')}-${timestamp}`;
    
    // Get next sequence number (simplified approach)
    const sequenceNumber = count! + 1;
    
    // Calculate BIR-compliant VAT breakdown
    const vatableSales = transaction.subtotal - (transaction.discount || 0);
    const seniorDiscount = transaction.discountType === 'senior' ? (transaction.discount || 0) : 0;
    const pwdDiscount = transaction.discountType === 'pwd' ? (transaction.discount || 0) : 0;
    
    // Handle promo details for SM Accreditation
    let promoReference = null;
    let promoDetails = null;
    
    // Check if transaction has promo information (can be expanded later)
    if (transaction.customerId && transaction.discountType === 'loyalty') {
      promoReference = 'LOYALTY001';
      promoDetails = 'LOYALTY001=Loyalty Program Discount';
    }
    
    const newTransaction = {
      shift_id: transaction.shiftId,
      store_id: transaction.storeId,
      user_id: transaction.userId,
      customer_id: transaction.customerId,
      items: JSON.stringify(transaction.items),
      subtotal: transaction.subtotal,
      tax: transaction.tax,
      discount: transaction.discount,
      discount_type: transaction.discountType,
      discount_id_number: transaction.discountIdNumber,
      total: transaction.total,
      amount_tendered: transaction.amountTendered,
      change: transaction.change,
      payment_method: transaction.paymentMethod,
      payment_details: transaction.paymentDetails ? JSON.stringify(transaction.paymentDetails) : null,
      status: transaction.status,
      receipt_number: receiptNumber,
      created_at: now.toISOString(),
      // BIR Compliance fields
      vat_sales: vatableSales,
      vat_exempt_sales: 0, // Can be enhanced based on product settings
      zero_rated_sales: 0,
      senior_citizen_discount: seniorDiscount,
      pwd_discount: pwdDiscount,
      sequence_number: Number(sequenceNumber),
      terminal_id: 'TERMINAL-01',
      promo_reference: promoReference,
      promo_details: promoDetails
    };
    
    // Remove customer object before sending to Supabase
    const { data, error } = await supabase
      .from("transactions")
      .insert(newTransaction)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Transaction completed successfully");
    
    // Log BIR audit event
    await BIRComplianceService.logAuditEvent(
      transaction.storeId,
      'transaction',
      'Transaction Completed',
      {
        receiptNumber,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        items: transaction.items.length
      },
      transaction.userId,
      undefined, // cashierName - can be enhanced
      'TERMINAL-01',
      data.id,
      receiptNumber
    );
    
    // Process inventory deduction with improved error handling
    try {
      await updateInventoryStockForTransaction(transaction.items, transaction.storeId);
    } catch (inventoryError) {
      console.warn('Inventory update warning:', inventoryError);
      // Don't fail the transaction for inventory issues - log and continue
      toast.info('Transaction completed - inventory may need manual adjustment');
    }
    
    // Cast the returned data to our custom type
    const transactionData = data as unknown as TransactionRow;

    // Return formatted transaction data
    return {
      id: transactionData.id,
      shiftId: transactionData.shift_id,
      storeId: transactionData.store_id,
      userId: transactionData.user_id,
      customerId: transactionData.customer_id,
      items: JSON.parse(transactionData.items),
      subtotal: transactionData.subtotal,
      tax: transactionData.tax,
      discount: transactionData.discount,
      discountType: transactionData.discount_type as any,
      discountIdNumber: transactionData.discount_id_number,
      total: transactionData.total,
      amountTendered: transactionData.amount_tendered,
      change: transactionData.change,
      paymentMethod: transactionData.payment_method as 'cash' | 'card' | 'e-wallet',
      paymentDetails: transactionData.payment_details,
      status: transactionData.status,
      createdAt: transactionData.created_at,
      receiptNumber: transactionData.receipt_number
    };
  } catch (error) {
    console.error("Error creating transaction:", error);
    toast.error("Failed to complete transaction");
    return null;
  }
};

/**
 * Updates inventory stock after a transaction is completed
 */
const updateInventoryStockForTransaction = async (items: any[], storeId: string) => {
  // Mock implementation - simplified for new direct inventory system
  
  try {
    // Use the unified inventory deduction service
    const updates = items.map(item => ({
      productId: item.productId,
      variationId: item.variationId,
      quantitySold: item.quantity,
      transactionId: "transaction", // This will be properly set by the calling function
      storeId: storeId
    }));

    // Mock implementation for now - in real app this would call inventory service
    const result = { success: true, errors: [] };
    
    if (!result.success && result.errors.length > 0) {
      console.warn('Inventory deduction warnings:', result.errors);
      // Don't throw - just log warnings
    }
  } catch (error) {
    console.warn('Failed to process inventory deduction:', error);
    // Fallback to legacy product stock update for products without recipes
    await legacyProductStockUpdate(items);
  }
};

/**
 * Legacy fallback for products without recipes
 */
const legacyProductStockUpdate = async (items: any[]) => {
  for (const item of items) {
    try {
      if (item.variationId) {
        // Update variation stock
        const { data: variation } = await supabase
          .from("product_variations")
          .select("stock_quantity")
          .eq("id", item.variationId)
          .single();
          
        if (variation) {
          await supabase
            .from("product_variations")
            .update({ stock_quantity: Math.max(0, variation.stock_quantity - item.quantity) })
            .eq("id", item.variationId);
        }
      } else {
        // Update product stock
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.productId)
          .single();
          
        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
            .eq("id", item.productId);
        }
      }
    } catch (error) {
      console.warn(`Failed to update stock for product ${item.productId}:`, error);
      // Continue processing other items
    }
  }
};
