

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id: string;
  store_id: string;
  image_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  product_variations?: ProductVariation[];
  sku: string;
  stock_quantity: number;
  category?: Category | string; // Support both Category object and string
  image?: string;
  // Legacy/compatibility properties
  barcode?: string;
  cost?: number;
  stockQuantity?: number;
  categoryId?: string;
  isActive?: boolean;
  storeId?: string;
  variations?: ProductVariation[];
}

export interface ProductVariation {
  id: string;
  product_id: string;
  name: string;
  price: number;
  stock_quantity: number;
  size?: ProductSize;
  sku?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Legacy/compatibility properties
  stockQuantity?: number;
  isActive?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  store_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Legacy/compatibility properties
  image?: string;
  isActive?: boolean;
  storeId?: string;
}

export type ProductSize = 'regular' | 'mini' | 'croffle-overload';
