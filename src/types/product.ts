
import { Recipe } from './recipe';

export type ProductSize = 'regular' | 'mini' | 'croffle-overload';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  categoryId?: string; // For frontend compatibility
  category?: Category; // Add full category object
  image_url?: string;
  image?: string; // For frontend compatibility
  is_active: boolean;
  isActive?: boolean; // For frontend compatibility
  variations?: ProductVariation[];
  store_id?: string;
  storeId?: string; // For frontend compatibility
  sku: string;
  barcode?: string;
  cost?: number;
  stock_quantity: number;
  stockQuantity?: number; // For frontend compatibility
  recipe?: Recipe; // Optional recipe connection
}

export interface ProductVariation {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  isActive?: boolean; // For frontend compatibility
  stock_quantity: number;
  stockQuantity?: number; // For frontend compatibility
  product_id: string;
  productId?: string; // For frontend compatibility
  sku: string;
  size?: ProductSize; // Add size field
  recipe?: Recipe; // Optional recipe connection
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  image?: string; // For frontend compatibility
  is_active: boolean;
  isActive?: boolean; // For frontend compatibility
  store_id?: string;
  storeId?: string; // For frontend compatibility
}
