
export interface RecipeTemplate {
  id: string;
  name: string;
  description?: string;
  category_name?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  is_active: boolean;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  ingredients: RecipeTemplateIngredient[];
  total_cost?: number;
  cost_per_serving?: number;
  approval_status?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export interface RecipeTemplateIngredient {
  id: string;
  recipe_template_id: string;
  commissary_item_id: string;
  commissary_item_name: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  created_at: string;
}

export interface DeploymentResult {
  storeId: string;
  success: boolean;
  recipeId?: string;
  productId?: string;
  error?: string;
}

export interface ApprovalAction {
  action: 'approve' | 'reject';
  reason?: string;
}
