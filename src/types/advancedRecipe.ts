// Advanced recipe management types for groups, combos, and add-ons

export interface RecipeIngredientGroup {
  id: string;
  recipe_template_id: string;
  name: string;
  description?: string;
  selection_type: 'required_one' | 'optional_one' | 'multiple' | 'required_all';
  min_selections: number;
  max_selections?: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipePricingMatrix {
  id: string;
  recipe_template_id: string;
  size_category?: string; // 'mini', 'regular', 'overload'
  temperature_category?: string; // 'hot', 'ice', 'room_temp'
  base_price: number;
  price_modifier: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddonCategory {
  id: string;
  name: string;
  description?: string;
  category_type: 'topping' | 'sauce' | 'extra' | 'biscuit' | 'packaging';
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComboPricingRule {
  id: string;
  name: string;
  base_category: string; // 'mini_croffle', 'regular_croffle', 'glaze_croffle'
  combo_category: string; // 'hot_espresso', 'ice_espresso'
  combo_price: number;
  discount_amount: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface EnhancedRecipeTemplate {
  id: string;
  name: string;
  description?: string;
  category_name?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  image_url?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  
  // Advanced features
  ingredient_groups?: RecipeIngredientGroup[];
  pricing_matrix?: RecipePricingMatrix[];
  available_addons?: string[]; // addon category IDs
  combo_rules?: ComboPricingRule[];
}

// Form interfaces for UI
export interface RecipeIngredientGroupForm {
  name: string;
  description?: string;
  selection_type: 'required_one' | 'optional_one' | 'multiple' | 'required_all';
  min_selections: number;
  max_selections?: number;
  display_order: number;
}

export interface RecipePricingMatrixForm {
  size_category?: string;
  temperature_category?: string;
  base_price: number;
  price_modifier: number;
}

// Pricing calculation interfaces
export interface PricingCalculationInput {
  base_category: string;
  size_category?: string;
  temperature_category?: string;
  selected_addons: string[];
  combo_items?: string[];
}

export interface PricingCalculationResult {
  base_price: number;
  addon_total: number;
  combo_discount: number;
  final_price: number;
  breakdown: {
    base: number;
    addons: Array<{ name: string; price: number }>;
    combo_savings: number;
  };
}