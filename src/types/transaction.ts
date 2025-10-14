
export interface CartItem {
  productId: string;
  product: import('./product').Product;
  variationId?: string;
  variation?: import('./product').ProductVariation;
  quantity: number;
  notes?: string;
  price: number;
  customization?: {
    recipe_id: string;
    selected_choices: Array<{
      choice_group_name: string;
      selected_ingredient: {
        id: string;
        ingredient_name: string;
        quantity: number;
        unit: string;
        cost_per_unit: number;
      };
    }>;
    display_name: string;
    final_price: number;
  };
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tin?: string; // TIN for BIR compliance
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
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary';
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
  // Order type information
  orderType?: 'dine_in' | 'online_delivery';
  deliveryPlatform?: 'grab_food' | 'food_panda';
  deliveryOrderNumber?: string;
  // BIR Compliance Fields
  vat_sales?: number;
  vat_exempt_sales?: number;
  zero_rated_sales?: number;
  senior_citizen_discount?: number;
  pwd_discount?: number;
  sequence_number?: number;
  terminal_id?: string;
  // Detailed discount breakdown
  senior_discounts_detail?: Array<{
    id: string;
    idNumber: string;
    name: string;
    discountAmount: number;
  }>;
  other_discount_detail?: {
    type: 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary' | 'bogo';
    amount: number;
    idNumber?: string;
    justification?: string;
  };
  vat_exemption_amount?: number;
}

export interface TransactionItem {
  productId: string;
  variationId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
