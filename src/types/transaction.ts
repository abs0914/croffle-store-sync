
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
  storeName?: string;
}

export interface Shift {
  id: string;
  userId: string;
  storeId: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  status: 'active' | 'closed';
  startPhoto?: string;
  endPhoto?: string;
  startInventoryCount?: Record<string, number>;
  endInventoryCount?: Record<string, number>;
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
