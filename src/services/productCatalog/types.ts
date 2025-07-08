
export type ProductStatus =
  | 'available'
  | 'out_of_stock'
  | 'temporarily_unavailable'
  | 'discontinued';

export interface ProductCatalog {
  id: string;
  store_id: string;
  product_name: string;
  description?: string;
  price: number;
  is_available: boolean;
  product_status?: ProductStatus;
  display_order?: number;
  image_url?: string;
  recipe_id?: string;
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
  inventory_item?: {
    id: string;
    item: string;
    unit: string;
    cost?: number;
    stock_quantity: number;
  };
}

export interface CreateProductForm {
  product_name: string;
  description?: string;
  price: number;
  is_available: boolean;
  display_order?: number;
  image_url?: string;
  recipe_id?: string;
  ingredients: CreateProductIngredientForm[];
}

export interface CreateProductIngredientForm {
  inventory_stock_id: string;
  commissary_item_id?: string;
  required_quantity: number;
  unit: string;
}

// Stock Order related types
export interface StockOrder {
  id: string;
  order_number: string;
  store_id: string;
  status: 'requested' | 'pending' | 'approved' | 'fulfilled' | 'cancelled';
  requested_by: string;
  approved_by?: string;
  order_date: string;
  fulfilled_date?: string;
  notes?: string;
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
