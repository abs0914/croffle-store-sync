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
    
    return data || [];
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
    
    return data || [];
  } catch (error) {
    console.error("Error fetching customer transactions:", error);
    return [];
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
