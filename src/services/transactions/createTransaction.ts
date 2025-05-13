
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
      created_at: now.toISOString()
    };
    
    // Start a transaction to ensure data consistency
    const { data, error } = await supabase
      .from("transactions")
      .insert(newTransaction)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Transaction completed successfully");
    
    // Create inventory transactions for each product to trigger the stock updates
    await createInventoryTransactionsForSale(transaction);
    
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
 * Creates inventory transactions for each product in a sale to trigger stock updates
 */
const createInventoryTransactionsForSale = async (transaction: Omit<Transaction, "id" | "createdAt" | "receiptNumber">) => {
  try {
    for (const item of transaction.items) {
      // First fetch the current quantity
      let currentQuantity: number;
      let productId: string = item.productId;
      let variationId: string | null = null;
      
      if (item.variationId) {
        // Get variation stock
        const { data: variation } = await supabase
          .from("product_variations")
          .select("stock_quantity")
          .eq("id", item.variationId)
          .single();
          
        if (!variation) continue;
        currentQuantity = variation.stock_quantity;
        variationId = item.variationId;
      } else {
        // Get product stock
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.productId)
          .single();
          
        if (!product) continue;
        currentQuantity = product.stock_quantity;
      }
      
      // Create inventory transaction that will trigger stock update
      await supabase.from("inventory_transactions").insert({
        store_id: transaction.storeId,
        product_id: productId,
        variation_id: variationId,
        transaction_type: 'sale',
        quantity: item.quantity,
        previous_quantity: currentQuantity,
        new_quantity: Math.max(0, currentQuantity - item.quantity),
        reference_id: transaction.shiftId, // Reference to the shift
        created_by: transaction.userId
      });
    }
  } catch (error) {
    console.error("Error updating inventory for transaction:", error);
    // We don't throw here to avoid failing the transaction if inventory update fails
    // But we log the error and could implement a retry mechanism or notification system
  }
};
