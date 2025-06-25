
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types";
import { toast } from "sonner";

// Type definition for customer data from Supabase
interface CustomerRow {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  store_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Fetches a customer by phone number
 */
export const fetchCustomerByPhone = async (phone: string): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select(`
        *,
        stores:store_id (
          name
        )
      `)
      .eq("phone", phone)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }
    
    if (!data) return null;
    
    // Map the database customer row to our Customer type
    const customerData = data as CustomerRow & { stores: { name: string } | null };
    
    return {
      id: customerData.id,
      name: customerData.name,
      email: customerData.email || undefined,
      phone: customerData.phone,
      storeId: customerData.store_id || undefined,
      storeName: customerData.stores?.name,
      // These properties might not exist in the database schema
      address: undefined, // We don't have this field in the DB
      loyaltyPoints: 0    // We don't have this field in the DB
    };
  } catch (error) {
    console.error("Error fetching customer:", error);
    toast.error("Failed to fetch customer details");
    return null;
  }
};

/**
 * Creates or updates a customer
 */
export const createOrUpdateCustomer = async (customer: Omit<Customer, "id"> & { id?: string }): Promise<Customer | null> => {
  try {
    const { currentStore } = await import("@/contexts/StoreContext").then(m => m.useStore());
    const storeId = currentStore?.id || customer.storeId;

    if (!storeId) {
      toast.error("Store ID is required to create or update a customer");
      return null;
    }

    // Get the store name for the response if possible
    let storeName = customer.storeName;
    if (storeId && !storeName) {
      const { data: storeData } = await supabase
        .from("stores")
        .select("name")
        .eq("id", storeId)
        .single();
      
      if (storeData) {
        storeName = storeData.name;
      }
    }

    if (customer.id) {
      // Update existing customer
      const { data, error } = await supabase
        .from("customers")
        .update({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          store_id: storeId // Ensure we keep the store_id when updating
        })
        .eq("id", customer.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      toast.success("Customer updated successfully");
      
      // Map the returned customer data to our Customer type
      return {
        id: data.id,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone,
        storeId: data.store_id || undefined,
        storeName,
        // These fields don't exist in the database schema
        address: customer.address, // Keep the value provided by the user
        loyaltyPoints: 0 // Default value since it doesn't exist in DB
      };
    } else {
      // Create new customer
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          store_id: storeId // Set the store_id when creating
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      toast.success("Customer created successfully");
      
      // Map the returned customer data to our Customer type
      return {
        id: data.id,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone,
        storeId: data.store_id || undefined,
        storeName,
        // These fields don't exist in the database schema
        address: customer.address, // Keep the value provided by the user
        loyaltyPoints: 0 // Default value since it doesn't exist in DB
      };
    }
  } catch (error) {
    console.error("Error saving customer:", error);
    toast.error("Failed to save customer details");
    return null;
  }
};
