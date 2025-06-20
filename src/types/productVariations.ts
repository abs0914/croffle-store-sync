
export interface ProductVariation {
  id: string;
  product_catalog_id: string;
  variation_type: 'size' | 'temperature';
  name: string;
  price_modifier: number;
  is_default: boolean;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AddOnItem {
  id: string;
  name: string;
  category: 'classic_topping' | 'classic_sauce' | 'premium_topping' | 'premium_sauce' | 'biscuits';
  price: number;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ComboRule {
  id: string;
  name: string;
  base_item_category: string;
  combo_item_category: string;
  combo_price: number;
  discount_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnhancedProductCatalogItem {
  id: string;
  product_name: string;
  description?: string;
  price: number;
  store_id: string;
  recipe_id?: string;
  is_available: boolean;
  display_order: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  variations?: ProductVariation[];
  available_addons?: AddOnItem[];
}

export interface CartItem {
  product: EnhancedProductCatalogItem;
  selectedVariations: ProductVariation[];
  selectedAddOns: AddOnItem[];
  quantity: number;
  finalPrice: number;
  id: string;
}
