import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types";
import { toast } from "sonner";

export const fetchCustomers = async (storeId: string): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("store_id", storeId)
      .order("name");
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map database fields to our TypeScript interface
    return data?.map(item => ({
      id: item.id,
      name: item.name,
      email: item.email || undefined,
      phone: item.phone,
      store_id: item.store_id,
      storeId: item.store_id,
      address: (item as any).address || undefined,
      created_at: item.created_at,
      updated_at: item.updated_at
    })) || [];
  } catch (error) {
    console.error("Error fetching customers:", error);
    toast.error("Failed to load customers");
    return [];
  }
};

export const fetchCustomer = async (id: string): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map database fields to our TypeScript interface
    return {
      id: data.id,
      name: data.name,
      email: data.email || undefined,
      phone: data.phone,
      store_id: data.store_id,
      storeId: data.store_id,
      address: (data as any).address || undefined,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error("Error fetching customer:", error);
    toast.error("Failed to load customer details");
    return null;
  }
};

export const createCustomer = async (customerData: Omit<Customer, "id" | "created_at" | "updated_at">): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        store_id: customerData.store_id,
        address: customerData.address
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    toast.success("Customer created successfully");

    return {
      id: data.id,
      name: data.name,
      email: data.email || undefined,
      phone: data.phone,
      store_id: data.store_id,
      storeId: data.store_id,
      storeName: customerData.storeName,
      address: (data as any).address || undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error("Error creating customer:", error);
    toast.error("Failed to create customer");
    return null;
  }
};

export const updateCustomer = async (id: string, customerData: Partial<Customer>): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .update({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    toast.success("Customer updated successfully");

    return {
      id: data.id,
      name: data.name,
      email: data.email || undefined,
      phone: data.phone,
      store_id: data.store_id,
      storeId: data.store_id,
      address: (data as any).address || undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error("Error updating customer:", error);
    toast.error("Failed to update customer");
    return null;
  }
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    toast.success("Customer deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting customer:", error);
    toast.error("Failed to delete customer");
    return false;
  }
};

export const generateSampleCustomers = (): Customer[] => {
  const mockTimestamp = new Date().toISOString();
  
  return [
    {
      id: "sample-1",
      name: "Sample Customer 1",
      email: "sample1@example.com",
      phone: "+63-917-111-1111",
      store_id: "store-1",
      storeId: "store-1",
      storeName: "Sample Store",
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
    },
    {
      id: "sample-2", 
      name: "Sample Customer 2",
      email: "sample2@example.com",
      phone: "+63-917-222-2222",
      store_id: "store-1",
      storeId: "store-1",
      storeName: "Sample Store",
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
    },
  ];
};
