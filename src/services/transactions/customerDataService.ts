import { supabase } from "@/integrations/supabase/client";
import { Customer, Transaction } from "@/types";

interface CustomerWithStats extends Customer {
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  registrationDate: string;
}

export const fetchCustomerData = async (storeId: string): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("store_id", storeId);
    
    if (error) {
      throw new Error(error.message);
    }
    
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
    console.error("Error fetching customer data:", error);
    return [];
  }
};

export const fetchCustomerTransactions = async (customerId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("customer_id", customerId);
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map database fields to Transaction interface
    return data?.map(item => ({
      id: item.id,
      receiptNumber: item.receipt_number,
      receipt_number: item.receipt_number,
      customer_id: item.customer_id,
      store_id: item.store_id,
      user_id: item.user_id,
      shift_id: item.shift_id,
      total: item.total,
      subtotal: item.subtotal,
      tax_amount: (item as any).tax || (item as any).tax_amount || 0,
      tax: (item as any).tax || (item as any).tax_amount || 0,
      discount: item.discount,
      payment_method: item.payment_method,
      status: (item.status === 'completed' || item.status === 'pending' || item.status === 'cancelled' || item.status === 'voided') 
        ? item.status 
        : 'completed' as const,
      items: typeof item.items === 'string' ? JSON.parse(item.items) : item.items,
      created_at: item.created_at,
      updated_at: (item as any).updated_at || item.created_at
    })) || [];
  } catch (error) {
    console.error("Error fetching customer transactions:", error);
    return [];
  }
};

export const searchCustomers = async (query: string, storeId?: string): Promise<Customer[]> => {
  try {
    let queryBuilder = supabase
      .from("customers")
      .select("*");
    
    if (storeId) {
      queryBuilder = queryBuilder.eq("store_id", storeId);
    }
    
    if (query.trim()) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
    }
    
    const { data, error } = await queryBuilder.order("name");
    
    if (error) {
      throw new Error(error.message);
    }
    
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
    console.error("Error searching customers:", error);
    return [];
  }
};

export const fetchCustomerPurchaseHistory = async (customerId: string): Promise<Transaction[]> => {
  return fetchCustomerTransactions(customerId);
};

export const registerStoreCustomer = async (customerData: Omit<Customer, "id">, storeId: string): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        store_id: storeId,
        address: customerData.address
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

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
    console.error("Error registering customer:", error);
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
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No customer found
      }
      throw new Error(error.message);
    }
    
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
    console.error("Error fetching customer by phone:", error);
    return null;
  }
};

export const createOrUpdateCustomer = async (customerData: Omit<Customer, "id"> & { id?: string }): Promise<Customer | null> => {
  try {
    if (customerData.id) {
      // Update existing customer
      const { data, error } = await supabase
        .from("customers")
        .update({
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address
        })
        .eq("id", customerData.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

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
    } else {
      // Create new customer
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
    }
  } catch (error) {
    console.error("Error creating/updating customer:", error);
    return null;
  }
};

export const generateSampleCustomerData = (): Customer[] => {
  const mockTimestamp = new Date().toISOString();
  
  return [
    {
      id: "1",
      name: "Maria Santos",
      email: "maria.santos@email.com",
      phone: "+63-917-123-4567",
      address: "123 Katipunan Avenue, Quezon City",
      store_id: "store-1",
      storeId: "store-1",
      storeName: "Croffle Central - QC",
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
    },
    {
      id: "2",
      name: "Ricardo Diaz",
      email: "ricardo.diaz@email.com",
      phone: "+63-917-987-6543",
      address: "456 Escario Street, Cebu City",
      store_id: "store-2",
      storeId: "store-2",
      storeName: "Croffle Corner - Cebu",
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
    },
    {
      id: "3",
      name: "Lina Reyes",
      email: "lina.reyes@email.com",
      phone: "+63-917-555-1212",
      address: "789 Abanao Square, Baguio City",
      store_id: "store-3",
      storeId: "store-3",
      storeName: "Croffle Avenue - Baguio",
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
    }
  ];
};

export const generateSampleTransactionData = (): Transaction[] => {
  const mockTimestamp = new Date().toISOString();
  
  return [
    {
      id: "txn-001",
      receipt_number: "2024-001",
      receiptNumber: "2024-001",
      shiftId: "shift-001",
      shift_id: "shift-001",
      storeId: "store-1",
      store_id: "store-1",
      userId: "user-001",
      user_id: "user-001",
      customerId: "1",
      customer_id: "1",
      items: [{ productId: "1", name: "Classic Croffle", quantity: 2, unitPrice: 120, totalPrice: 240 }],
      subtotal: 240,
      tax_amount: 28.8,
      tax: 28.8,
      discount: 0,
      total: 268.8,
      payment_method: "cash",
      paymentMethod: "cash",
      status: "completed",
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
    },
    {
      id: "txn-002",
      receipt_number: "2024-002",
      receiptNumber: "2024-002",
      shiftId: "shift-002",
      shift_id: "shift-002",
      storeId: "store-2",
      store_id: "store-2",
      userId: "user-002",
      user_id: "user-002",
      customerId: "2",
      customer_id: "2",
      items: [{ productId: "2", name: "Chocolate Croffle", quantity: 1, unitPrice: 140, totalPrice: 140 }],
      subtotal: 140,
      tax_amount: 16.8,
      tax: 16.8,
      discount: 10,
      total: 146.8,
      payment_method: "card",
      paymentMethod: "card",
      status: "completed",
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
    },
    {
      id: "txn-003",
      receipt_number: "2024-003",
      receiptNumber: "2024-003",
      shiftId: "shift-003",
      shift_id: "shift-003",
      storeId: "store-3",
      store_id: "store-3",
      userId: "user-003",
      user_id: "user-003",
      customerId: "3",
      customer_id: "3",
      items: [{ productId: "3", name: "Strawberry Croffle", quantity: 3, unitPrice: 160, totalPrice: 480 }],
      subtotal: 480,
      tax_amount: 57.6,
      tax: 57.6,
      discount: 0,
      total: 537.6,
      payment_method: "e-wallet",
      paymentMethod: "e-wallet",
      status: "completed",
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
    }
  ];
};

export const createSampleCustomer = async (): Promise<Customer> => {
  const mockTimestamp = new Date().toISOString();
  
  return {
    id: "new-customer-id",
    name: "Sample Customer",
    email: "sample@example.com",
    phone: "+63-917-000-0000",
    address: "Sample Address",
    store_id: "store-1",
    storeId: "store-1",
    storeName: "Sample Store",
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
  };
};
