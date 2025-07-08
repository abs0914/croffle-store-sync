
import { Recipe } from '@/types/inventoryManagement';

export interface RecipeMetrics {
  totalRecipes: number;
  activeRecipes: number;
  draftRecipes: number;
  deployedStores: number;
  averageCost: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
}

export const calculateRecipeMetrics = (recipes: Recipe[]): RecipeMetrics => {
  console.log('Calculating metrics for recipes:', recipes?.length || 0);
  
  // Handle empty or undefined recipes array
  const recipeArray = recipes || [];
  
  const activeRecipes = recipeArray.filter(recipe => recipe.is_active).length;
  const draftRecipes = recipeArray.filter(recipe => recipe.approval_status === 'draft' || !recipe.approval_status).length;
  const pendingApproval = recipeArray.filter(recipe => recipe.approval_status === 'pending_approval').length;
  const approved = recipeArray.filter(recipe => recipe.approval_status === 'approved').length;
  const rejected = recipeArray.filter(recipe => recipe.approval_status === 'rejected').length;
  
  // Calculate unique stores that have deployed recipes
  const uniqueStores = new Set(recipeArray.map(recipe => recipe.store_id)).size;
  
  // Calculate average cost from recipe ingredients
  const totalCost = recipeArray.reduce((sum, recipe) => {
    const recipeCost = recipe.ingredients?.reduce((ingredientSum, ingredient) => {
      const cost = ingredient.inventory_stock?.cost || 0;
      return ingredientSum + (cost * ingredient.quantity);
    }, 0) || 0;
    return sum + recipeCost;
  }, 0);
  
  const averageCost = recipeArray.length > 0 ? totalCost / recipeArray.length : 0;
  
  // Additional debugging metrics
  const recipesWithProducts = recipeArray.filter(recipe => recipe.product_id).length;
  const recipesWithoutProducts = recipeArray.filter(recipe => !recipe.product_id).length;
  const recipesWithIngredients = recipeArray.filter(recipe => recipe.ingredients && recipe.ingredients.length > 0).length;
  
  const metrics = {
    totalRecipes: recipeArray.length,
    activeRecipes,
    draftRecipes,
    deployedStores: uniqueStores,
    averageCost,
    pendingApproval,
    approved,
    rejected
  };
  
  console.log('Calculated metrics:', {
    ...metrics,
    recipesWithProducts,
    recipesWithoutProducts,
    recipesWithIngredients,
    storeBreakdown: recipeArray.reduce((acc: any, recipe) => {
      // Fix: Access store_name from the recipe object directly since we set it during transformation
      const storeName = (recipe as any).store_name || 'Unknown';
      acc[storeName] = (acc[storeName] || 0) + 1;
      return acc;
    }, {})
  });
  
  return metrics;
};
