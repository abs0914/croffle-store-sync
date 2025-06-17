
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  productId: string;
  variationId?: string;
  variation?: {
    id: string;
    name: string;
  };
  product: {
    id: string;
    name: string;
  };
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}
