
import { supabase } from "@/integrations/supabase/client";
import { Transaction, CartItem, Customer } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

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
    for (const item of transaction.items) {
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

export const fetchCustomerByPhone = async (phone: string): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }
    
    if (!data) return null;
    
    // Create a Customer object with optional fields that match your Customer type
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      // Use optional chaining to safely handle potentially missing properties
      address: data.address || undefined,
      loyaltyPoints: data.loyalty_points || 0
    };
  } catch (error) {
    console.error("Error fetching customer:", error);
    toast.error("Failed to fetch customer details");
    return null;
  }
};

export const createOrUpdateCustomer = async (customer: Omit<Customer, "id"> & { id?: string }): Promise<Customer | null> => {
  try {
    if (customer.id) {
      // Update existing customer
      const { data, error } = await supabase
        .from("customers")
        .update({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address
        })
        .eq("id", customer.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      toast.success("Customer updated successfully");
      
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address || undefined,
        loyaltyPoints: data.loyalty_points || 0
      };
    } else {
      // Create new customer
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      toast.success("Customer created successfully");
      
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address || undefined,
        loyaltyPoints: data.loyalty_points || 0
      };
    }
  } catch (error) {
    console.error("Error saving customer:", error);
    toast.error("Failed to save customer details");
    return null;
  }
};
