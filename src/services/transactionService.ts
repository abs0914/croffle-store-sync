
import { supabase } from "@/integrations/supabase/client";
import { Transaction, CartItem, Customer } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

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
      ...transaction,
      receipt_number: receiptNumber,
      created_at: now.toISOString(),
      items: JSON.stringify(transaction.items)
    };
    
    // Remove customer object before sending to Supabase
    const { customer, ...transactionData } = newTransaction as any;
    
    const { data, error } = await supabase
      .from("transactions")
      .insert(transactionData)
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
    
    // Return formatted transaction data
    return {
      id: data.id,
      shiftId: data.shift_id,
      storeId: data.store_id,
      userId: data.user_id,
      customerId: data.customer_id,
      items: JSON.parse(data.items),
      subtotal: data.subtotal,
      tax: data.tax,
      discount: data.discount,
      discountType: data.discount_type,
      discountIdNumber: data.discount_id_number,
      total: data.total,
      amountTendered: data.amount_tendered,
      change: data.change,
      paymentMethod: data.payment_method,
      paymentDetails: data.payment_details,
      status: data.status,
      createdAt: data.created_at,
      receiptNumber: data.receipt_number
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
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      loyaltyPoints: data.loyalty_points
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
        address: data.address,
        loyaltyPoints: data.loyalty_points
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
        address: data.address,
        loyaltyPoints: data.loyalty_points
      };
    }
  } catch (error) {
    console.error("Error saving customer:", error);
    toast.error("Failed to save customer details");
    return null;
  }
};
