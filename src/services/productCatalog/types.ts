
export interface ProductCatalog {
  id: string;
  store_id: string;
  recipe_id?: string;
  product_name: string;
  description?: string;
  price: number;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  ingredients?: ProductIngredient[];
}

export interface ProductIngredient {
  id: string;
  product_catalog_id: string;
  inventory_stock_id: string;
  commissary_item_id?: string;
  required_quantity: number;
  unit: string;
  created_at: string;
}

export interface StockOrder {
  id: string;
  store_id: string;
  order_number: string;
  order_date: string;
  status: 'requested' | 'pending' | 'approved' | 'fulfilled' | 'cancelled';
  requested_by: string;
  approved_by?: string;
  fulfilled_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: StockOrderItem[];
}

export interface StockOrderItem {
  id: string;
  stock_order_id: string;
  inventory_stock_id: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit_cost?: number;
  notes?: string;
  created_at: string;
  inventory_item?: {
    id: string;
    item: string;
    unit: string;
    stock_quantity: number;
  };
}
