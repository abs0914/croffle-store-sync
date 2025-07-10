// Recipe Management Types

export interface DeploymentResult {
  success: boolean;
  storeId: string;
  storeName: string;
  recipeId?: string;
  error?: string;
  warnings?: string[];
  missingIngredients?: string[];
}

export interface DeploymentOptions {
  priceMarkup?: number;
  customName?: string;
  customDescription?: string;
  isActive?: boolean;
  pricingProfileId?: string;
  ingredientSubstitutions?: IngredientSubstitution[];
}

export interface IngredientSubstitution {
  originalIngredientName: string;
  substituteIngredientName: string;
  substituteCostPerUnit: number;
  notes?: string;
}

export interface PricingProfile {
  id: string;
  store_id: string;
  profile_name: string;
  base_markup_percentage: number;
  category_markups: any;
  ingredient_cost_adjustments: any;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeploymentProgress {
  storeId: string;
  storeName: string;
  status: 'pending' | 'in-progress' | 'success' | 'error';
  progress: number;
  error?: string;
  warnings?: string[];
}

export interface RecipeDeploymentError {
  id: string;
  deployment_id: string;
  error_type: string;
  error_message: string;
  ingredient_name?: string;
  suggested_solution?: string;
  is_resolved: boolean;
  created_at: string;
}

export interface EnhancedDeploymentConfig {
  templateId: string;
  selectedStores: Array<{ id: string; name: string }>;
  deploymentOptions: DeploymentOptions;
  ingredientSubstitutions: IngredientSubstitution[];
  validateIngredients: boolean;
  createProducts: boolean;
}