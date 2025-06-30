
import type { EnhancedRecipeIngredient } from './types';

/**
 * Calculate recipe cost with enhanced ingredient breakdown
 */
export const calculateEnhancedRecipeCost = (ingredients: EnhancedRecipeIngredient[]): number => {
  return ingredients.reduce((total, ingredient) => {
    const cost = ingredient.cost_per_recipe_unit || ingredient.cost_per_unit || 0;
    return total + (ingredient.quantity * cost);
  }, 0);
};
