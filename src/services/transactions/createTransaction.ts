
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
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
export const createTransaction = async (transaction: Omit<Transaction, "id" | "created_at" | "receiptNumber">): Promise<Transaction | null> => {
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
    
    const newTransaction = {
      shift_id: transaction.shift_id || transaction.shiftId,
      store_id: transaction.store_id || transaction.storeId,
      user_id: transaction.user_id || transaction.userId,
      customer_id: transaction.customer_id || transaction.customerId,
      items: JSON.stringify(transaction.items),
      subtotal: transaction.subtotal,
      tax: transaction.tax_amount || transaction.tax,
      discount: transaction.discount,
      discount_type: transaction.discount_type || transaction.discountType,
      discount_id_number: transaction.discount_id_number || transaction.discountIdNumber,
      total: transaction.total,
      amount_tendered: transaction.amount_tendered || transaction.amountTendered,
      change: transaction.change,
      payment_method: transaction.payment_method || transaction.paymentMethod,
      payment_details: transaction.payment_details ? JSON.stringify(transaction.payment_details) : null,
      status: transaction.status,
      receipt_number: receiptNumber,
      created_at: now.toISOString()
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
    
    // Update inventory for each product
    await updateInventoryStockForTransaction(transaction.items);
    
    // Cast the returned data to our custom type
    const transactionData = data as unknown as TransactionRow;

    // Return formatted transaction data
    return {
      id: transactionData.id,
      shift_id: transactionData.shift_id,
      shiftId: transactionData.shift_id,
      store_id: transactionData.store_id,
      storeId: transactionData.store_id,
      user_id: transactionData.user_id,
      userId: transactionData.user_id,
      customer_id: transactionData.customer_id,
      customerId: transactionData.customer_id,
      items: JSON.parse(transactionData.items),
      subtotal: transactionData.subtotal,
      tax_amount: transactionData.tax,
      tax: transactionData.tax,
      discount: transactionData.discount,
      discount_type: transactionData.discount_type as any,
      discountType: transactionData.discount_type as any,
      discount_id_number: transactionData.discount_id_number,
      discountIdNumber: transactionData.discount_id_number,
      total: transactionData.total,
      amount_tendered: transactionData.amount_tendered,
      amountTendered: transactionData.amount_tendered,
      change: transactionData.change,
      payment_method: transactionData.payment_method as 'cash' | 'card' | 'e-wallet',
      paymentMethod: transactionData.payment_method as 'cash' | 'card' | 'e-wallet',
      payment_details: transactionData.payment_details,
      status: transactionData.status,
      created_at: transactionData.created_at,
      createdAt: transactionData.created_at,
      receipt_number: transactionData.receipt_number,
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
const updateInventoryStockForTransaction = async (items: any[]) => {
  for (const item of items) {
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
  }
};
