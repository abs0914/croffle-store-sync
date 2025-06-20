
export interface MenuCategory {
  id: string;
  name: string;
  type: 'croffles' | 'drinks' | 'add-ons' | 'combos';
  subcategory?: string;
  display_order: number;
}

export interface MenuVariation {
  id: string;
  name: string;
  type: 'size' | 'temperature';
  price_modifier: number;
  is_default: boolean;
}

export interface MenuPricing {
  base_price: number;
  variations: MenuVariation[];
  add_on_categories: string[];
}

export interface RecipeTemplateIngredient {
  id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  notes?: string;
}

export interface EnhancedRecipeTemplate {
  id: string;
  name: string;
  category: MenuCategory;
  description?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  pricing: MenuPricing;
  ingredients: RecipeTemplateIngredient[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
}

export interface AddOnItem {
  id: string;
  name: string;
  category: 'classic_topping' | 'classic_sauce' | 'premium_topping' | 'premium_sauce' | 'biscuits';
  price: number;
  is_active: boolean;
}

export interface ComboRule {
  id: string;
  name: string;
  base_item_category: string;
  combo_item_category: string;
  combo_price: number;
  discount_amount: number;
  is_active: boolean;
}
