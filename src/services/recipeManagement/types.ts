// Core recipe template types
export interface RecipeTemplate {
  id: string;
  name: string;
  description?: string;
  category_name?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  total_cost?: number;
  suggested_price?: number;
  image_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  version: number;
  ingredients?: RecipeTemplateIngredient[];
}

export interface RecipeTemplateIngredient {
  id?: string;
  recipe_template_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  location_type: LocationType;
  inventory_stock_id?: string;
  store_unit?: string;
  recipe_to_store_conversion_factor?: number;
  uses_store_inventory: boolean;
}

// Input type for creating/updating ingredients
export interface RecipeTemplateIngredientInput {
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  location_type: LocationType;
  inventory_stock_id?: string;
  commissary_item_id?: string | null;
  supports_fractional?: boolean;
  notes?: string;
  store_unit?: string;
  recipe_to_store_conversion_factor?: number;
}

// Location types for ingredient availability
export type LocationType = 'all' | 'inside_cebu' | 'outside_cebu';

export const LOCATION_TYPES: Array<{ value: LocationType; label: string; description: string }> = [
  {
    value: 'all',
    label: 'All Locations',
    description: 'Available in all store locations'
  },
  {
    value: 'inside_cebu',
    label: 'Inside Cebu',
    description: 'Only available for stores inside Cebu'
  },
  {
    value: 'outside_cebu',
    label: 'Outside Cebu',
    description: 'Only available for stores outside Cebu'
  }
];

// Recipe deployment types
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  yield_quantity: number;
  total_cost: number;
  cost_per_serving: number;
  suggested_price?: number;
  recipe_template_id: string;
  store_id: string;
  product_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  inventory_stock_id?: string;
  commissary_item_id?: string;
}

// Analytics and metrics types
export interface RecipeMetrics {
  totalCost: number;
  costPerServing: number;
  profitMargin: number;
  popularityScore: number;
  deploymentCount: number;
}

// Cost analysis types
export interface CostBreakdown {
  ingredientCosts: Array<{
    name: string;
    cost: number;
    percentage: number;
  }>;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
}

// Recipe cost breakdown interface for analytics
export interface RecipeCostBreakdown {
  templateId: string;
  totalCost: number;
  costPerServing: number;
  suggestedPrice: number;
  ingredientCosts: Array<{
    ingredient_name: string;
    cost_per_unit: number;
    quantity: number;
    total_cost: number;
    percentage_of_total: number;
  }>;
  laborCost: number;
  overheadCost: number;
  profitability: {
    margin: number;
    breakEvenPoint: number;
    profitPerServing: number;
  };
  ingredients: Array<{
    ingredient_name: string;
    cost_per_unit: number;
    quantity: number;
    total_cost: number;
    percentage_of_total: number;
  }>;
}

// Ingredient cost alert interface
export interface IngredientCostAlert {
  templateId: string;
  templateName: string;
  ingredientName: string;
  ingredient_name: string;
  current_cost: number;
  average_cost: number;
  variance_percentage: number;
  percentageIncrease: number;
  alert_type: 'low' | 'high' | 'missing';
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

// Deployment result interface
export interface DeploymentResult {
  success: boolean;
  recipeId?: string;
  productId?: string;
  message: string;
  warnings?: string[];
  missingIngredients?: string[];
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Inventory mapping types (simplified for new system)
export interface InventoryMapping {
  ingredient_name: string;
  inventory_stock_id: string;
  conversion_factor: number;
  unit_cost: number;
}

// Export utility functions
export const getLocationLabel = (type: LocationType): string => {
  const location = LOCATION_TYPES.find(l => l.value === type);
  return location?.label || 'Unknown';
};

export const getLocationDescription = (type: LocationType): string => {
  const location = LOCATION_TYPES.find(l => l.value === type);
  return location?.description || '';
};

// Validation helpers
export const validateRecipeTemplate = (template: Partial<RecipeTemplate>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!template.name?.trim()) {
    errors.push('Recipe name is required');
  }

  if (!template.yield_quantity || template.yield_quantity <= 0) {
    errors.push('Yield quantity must be greater than 0');
  }

  if (!template.ingredients || template.ingredients.length === 0) {
    errors.push('At least one ingredient is required');
  }

  // Check for ingredients without cost
  if (template.ingredients) {
    const ingredientsWithoutCost = template.ingredients.filter(
      ing => !ing.cost_per_unit || ing.cost_per_unit <= 0
    );
    
    if (ingredientsWithoutCost.length > 0) {
      warnings.push(`${ingredientsWithoutCost.length} ingredient(s) missing cost information`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateIngredient = (ingredient: Partial<RecipeTemplateIngredientInput>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ingredient.ingredient_name?.trim()) {
    errors.push('Ingredient name is required');
  }

  if (!ingredient.quantity || ingredient.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  if (!ingredient.unit?.trim()) {
    errors.push('Unit is required');
  }

  if (!ingredient.cost_per_unit || ingredient.cost_per_unit < 0) {
    warnings.push('Cost per unit should be specified for accurate costing');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};