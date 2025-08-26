
export interface CustomerWithStats {
  id: string;
  name: string;
  email?: string;
  phone: string;
  storeId?: string;
  storeName?: string;
  address?: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  registrationDate: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName?: string;
  customerId?: string;
  customerName?: string;
  status: string;
  total: number;
  itemCount: number;
  paymentMethod: string;
  createdAt: string;
  items: any[];
}
