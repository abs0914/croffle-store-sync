
import { supabase } from "@/integrations/supabase/client";
import { Customer, Transaction } from "@/types";
import { toast } from "sonner";

/**
 * Search for customers using name or phone number
 */
export const searchCustomers = async (
  query: string,
  storeId?: string | null
): Promise<Customer[]> => {
  try {
    // First, build the query
    let queryBuilder = supabase
      .from("customers")
      .select(`
        *,
        stores:store_id (
          name
        )
      `);
    
    // If storeId is provided, filter by store
    if (storeId) {
      queryBuilder = queryBuilder.eq("store_id", storeId);
    }
    
    // Search by name or phone
    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
    }
    
    // Limit results and order by name
    const { data, error } = await queryBuilder
      .order("name")
      .limit(10);
    
    if (error) throw new Error(error.message);
    
    if (!data || data.length === 0) return [];
    
    return data.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email || undefined,
      phone: customer.phone,
      address: customer.address || undefined,
      tin: customer.tin || undefined,
      loyaltyPoints: customer.loyalty_points || 0,
      storeId: customer.store_id || undefined,
      storeName: customer.stores?.name || undefined
    }));
  } catch (error) {
    console.error("Error searching customers:", error);
    toast.error("Failed to search customers");
    return [];
  }
};

/**
 * Fetch customer purchase history
 */
export const fetchCustomerPurchaseHistory = async (customerId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    
    if (error) throw new Error(error.message);
    
    if (!data || data.length === 0) return [];
    
    // Map the database transaction data to our Transaction type
    return data.map(transaction => {
      // Parse payment details if it's a string
      let paymentDetails: any = transaction.payment_details;
      if (typeof paymentDetails === 'string') {
        try {
          paymentDetails = JSON.parse(paymentDetails);
        } catch (e) {
          paymentDetails = {};
        }
      } else if (paymentDetails === null) {
        paymentDetails = {};
      }
      
      return {
        id: transaction.id,
        shiftId: transaction.shift_id,
        storeId: transaction.store_id,
        userId: transaction.user_id,
        customerId: transaction.customer_id,
        items: typeof transaction.items === 'string' 
          ? JSON.parse(transaction.items) 
          : transaction.items,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        discount: transaction.discount,
        discountType: transaction.discount_type as any,
        discountIdNumber: transaction.discount_id_number,
        total: transaction.total,
        amountTendered: transaction.amount_tendered,
        change: transaction.change,
        paymentMethod: transaction.payment_method as 'cash' | 'card' | 'e-wallet',
        paymentDetails: paymentDetails as {
          cardType?: string;
          cardNumber?: string;
          eWalletProvider?: string;
          eWalletReferenceNumber?: string;
        },
        status: transaction.status as 'completed' | 'voided',
        createdAt: transaction.created_at,
        receiptNumber: transaction.receipt_number
      };
    });
  } catch (error) {
    console.error("Error fetching customer purchase history:", error);
    toast.error("Failed to fetch purchase history");
    return [];
  }
};

/**
 * Create a customer registration form handler
 * For store-specific registration
 */
export const registerStoreCustomer = async (
  customerData: Omit<Customer, "id">,
  storeId: string
): Promise<Customer | null> => {
  try {
    // Get the store name for the response
    const { data: storeData } = await supabase
      .from("stores")
      .select("name")
      .eq("id", storeId)
      .single();

    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        tin: customerData.tin,
        store_id: storeId
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    toast.success("Customer registered successfully");
    
    return {
      id: data.id,
      name: data.name,
      email: data.email || undefined,
      phone: data.phone,
      address: data.address || undefined,
      tin: data.tin || undefined,
      loyaltyPoints: data.loyalty_points || 0,
      storeId: storeId,
      storeName: storeData?.name
    };
  } catch (error) {
    console.error("Error registering customer:", error);
    toast.error("Failed to register customer");
    return null;
  }
};
