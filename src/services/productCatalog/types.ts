
export interface ProductCatalog {
  id: string;
  store_id: string;
  product_name: string;
  description?: string;
  price: number;
  is_available: boolean;
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
