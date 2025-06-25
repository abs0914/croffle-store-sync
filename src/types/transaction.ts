
export interface CartItem {
  productId: string;
  product: import('./product').Product;
  variationId?: string;
  variation?: import('./product').ProductVariation;
  quantity: number;
  notes?: string;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyaltyPoints?: number;
  storeId?: string;
  store_id?: string; // Database compatibility
  storeName?: string;
}

export interface Shift {
  id: string;
  userId: string;
  user_id?: string; // Database compatibility
  storeId: string;
  store_id?: string; // Database compatibility
  startTime: string;
  start_time?: string; // Database compatibility
  endTime?: string;
  end_time?: string; // Database compatibility
  startingCash: number;
  starting_cash?: number; // Database compatibility
  endingCash?: number;
  ending_cash?: number; // Database compatibility
  status: 'active' | 'closed';
  startPhoto?: string;
  start_photo?: string; // Database compatibility
  endPhoto?: string;
  end_photo?: string; // Database compatibility
  startInventoryCount?: Record<string, number>;
  start_inventory_count?: Record<string, number>; // Database compatibility
  endInventoryCount?: Record<string, number>;
  end_inventory_count?: Record<string, number>; // Database compatibility
}

export interface Transaction {
  id: string;
  shiftId: string;
  storeId: string;
  userId: string;
  customerId?: string;
  customer?: Customer;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  discount: number;
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo';
  discountIdNumber?: string;
  total: number;
  amountTendered?: number;
  change?: number;
  paymentMethod: 'cash' | 'card' | 'e-wallet';
  paymentDetails?: {
    cardType?: string;
    cardNumber?: string;
    eWalletProvider?: string;
    eWalletReferenceNumber?: string;
  };
  status: 'completed' | 'voided';
  createdAt: string;
  created_at?: string; // Database compatibility
  receiptNumber: string;
}

export interface TransactionItem {
  productId: string;
  variationId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
