import { useCallback } from 'react';
import { toast } from 'sonner';

interface RecipeError {
  type: 'validation' | 'deployment' | 'cost' | 'network' | 'permission';
  message: string;
  details?: string;
  suggestions?: string[];
}

export const useRecipeErrorHandling = () => {
  const handleError = useCallback((error: unknown, context?: string) => {
    let recipeError: RecipeError;

    if (error instanceof Error) {
      // Parse specific error types
      if (error.message.includes('cost must be greater than zero')) {
        recipeError = {
          type: 'cost',
          message: 'Invalid ingredient cost',
          details: error.message,
          suggestions: [
            'Ensure all ingredients have valid costs',
            'Check commissary inventory for cost data',
            'Update ingredient costs in template'
          ]
        };
      } else if (error.message.includes('not authorized')) {
        recipeError = {
          type: 'permission',
          message: 'Permission denied',
          details: 'You do not have permission to perform this action',
          suggestions: [
            'Contact your administrator',
            'Check your user role and store assignments'
          ]
        };
      } else if (error.message.includes('violates foreign key constraint')) {
        recipeError = {
          type: 'validation',
          message: 'Data integrity error',
          details: 'Referenced data is missing or invalid',
          suggestions: [
            'Ensure all ingredients exist in inventory',
            'Check store and category assignments',
            'Verify recipe template exists'
          ]
        };
      } else if (error.message.includes('duplicate key value')) {
        recipeError = {
          type: 'validation',
          message: 'Duplicate entry',
          details: 'A recipe with this name or SKU already exists',
          suggestions: [
            'Use a different name',
            'Check existing recipes',
            'Update the existing recipe instead'
          ]
        };
      } else {
        recipeError = {
          type: 'network',
          message: 'Operation failed',
          details: error.message,
          suggestions: [
            'Check your internet connection',
            'Try again in a moment',
            'Contact support if the issue persists'
          ]
        };
      }
    } else {
      recipeError = {
        type: 'network',
        message: 'Unknown error occurred',
        details: String(error),
        suggestions: ['Try refreshing the page', 'Contact support']
      };
    }

    // Show appropriate toast
    const title = context ? `${context}: ${recipeError.message}` : recipeError.message;
    
    toast.error(title, {
      description: recipeError.details,
      duration: 5000,
      action: recipeError.suggestions ? {
        label: 'Help',
        onClick: () => {
          toast.info('Suggestions:', {
            description: recipeError.suggestions!.join('\n• '),
            duration: 8000
          });
        }
      } : undefined
    });

    return recipeError;
  }, []);

  const validateRecipeData = useCallback((recipe: any) => {
    const errors: string[] = [];

    if (!recipe.name?.trim()) {
      errors.push('Recipe name is required');
    }

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      errors.push('At least one ingredient is required');
    }

    if (recipe.ingredients) {
      recipe.ingredients.forEach((ingredient: any, index: number) => {
        if (!ingredient.ingredient_name?.trim()) {
          errors.push(`Ingredient ${index + 1}: name is required`);
        }
        if (!ingredient.quantity || ingredient.quantity <= 0) {
          errors.push(`Ingredient ${index + 1}: quantity must be greater than zero`);
        }
        if (!ingredient.cost_per_unit || ingredient.cost_per_unit <= 0) {
          errors.push(`Ingredient ${index + 1}: cost must be greater than zero`);
        }
        if (!ingredient.unit?.trim()) {
          errors.push(`Ingredient ${index + 1}: unit is required`);
        }
      });
    }

    if (!recipe.serving_size || recipe.serving_size <= 0) {
      errors.push('Serving size must be greater than zero');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed:\n• ${errors.join('\n• ')}`);
    }

    return true;
  }, []);

  return {
    handleError,
    validateRecipeData
  };
};