
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
      .select("*")
      .eq("phone", phone)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }
    
    if (!data) return null;
    
    // Map the database customer row to our Customer type
    const customerData = data as CustomerRow;
    
    return {
      id: customerData.id,
      name: customerData.name,
      email: customerData.email || undefined,
      phone: customerData.phone,
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
    if (customer.id) {
      // Update existing customer
      const { data, error } = await supabase
        .from("customers")
        .update({
          name: customer.name,
          email: customer.email,
          phone: customer.phone
          // Not including address as it doesn't exist in the database
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
          phone: customer.phone
          // Not including address as it doesn't exist in the database
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
