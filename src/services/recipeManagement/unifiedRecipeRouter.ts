import { recipeSystemDetection, RecipeSystemType } from './recipeSystemDetection';
import { legacyRecipeService, LegacyRecipe } from './legacyRecipeService';
import { unifiedRecipeService, UnifiedRecipe } from '../unifiedRecipeService';
import { toast } from 'sonner';

// Normalize recipe interface for consistent handling
export interface NormalizedRecipe {
  id: string;
  name: string;
  store_id: string;
  total_cost: number;
  cost_per_serving: number;
  serving_size: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  system_type: RecipeSystemType;
  ingredients?: Array<{
    id: string;
    inventory_stock_id: string;
    ingredient_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
  }>;
}

export interface CreateRecipeRequest {
  name: string;
  store_id: string;
  instructions?: string;
  serving_size?: number;
  ingredients: Array<{
    inventory_stock_id: string;
    ingredient_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
  }>;
  target_system?: RecipeSystemType; // Allow specifying which system to use
}

export const unifiedRecipeRouter = {
  /**
   * Get all recipes for a store from both systems, normalized
   */
  async getRecipesByStore(storeId: string): Promise<NormalizedRecipe[]> {
    try {
      const { unified, legacy } = await recipeSystemDetection.getAllRecipesByStore(storeId);
      
      const normalizedRecipes: NormalizedRecipe[] = [];

      // Normalize unified recipes
      unified.forEach(recipe => {
        normalizedRecipes.push({
          ...recipe,
          system_type: 'unified' as RecipeSystemType
        });
      });

      // Normalize legacy recipes
      legacy.forEach(recipe => {
        normalizedRecipes.push({
          ...recipe,
          system_type: 'legacy' as RecipeSystemType,
          ingredients: recipe.recipe_ingredients || []
        });
      });

      return normalizedRecipes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching recipes via router:', error);
      toast.error('Failed to load recipes');
      return [];
    }
  },

  /**
   * Get a single recipe by ID, detecting which system it belongs to
   */
  async getRecipeById(recipeId: string): Promise<NormalizedRecipe | null> {
    try {
      const systemInfo = await recipeSystemDetection.detectRecipeSystem(recipeId);
      
      if (!systemInfo) {
        return null;
      }

      let recipe = null;
      if (systemInfo.type === 'unified') {
        recipe = await unifiedRecipeService.getRecipeById(recipeId);
        if (recipe) {
          return {
            ...recipe,
            system_type: 'unified' as RecipeSystemType
          };
        }
      } else {
        recipe = await legacyRecipeService.getRecipeById(recipeId);
        if (recipe) {
          return {
            ...recipe,
            system_type: 'legacy' as RecipeSystemType
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching recipe by ID via router:', error);
      return null;
    }
  },

  /**
   * Create a new recipe in the specified system (defaults to unified for new recipes)
   */
  async createRecipe(recipeData: CreateRecipeRequest): Promise<NormalizedRecipe | null> {
    const targetSystem = recipeData.target_system || 'unified';

    try {
      let createdRecipe = null;

      if (targetSystem === 'unified') {
        createdRecipe = await unifiedRecipeService.createRecipe({
          name: recipeData.name,
          store_id: recipeData.store_id,
          ingredients: recipeData.ingredients
        });

        if (createdRecipe) {
          return {
            ...createdRecipe,
            system_type: 'unified' as RecipeSystemType
          };
        }
      } else {
        createdRecipe = await legacyRecipeService.createRecipe({
          name: recipeData.name,
          store_id: recipeData.store_id,
          instructions: recipeData.instructions,
          serving_size: recipeData.serving_size,
          ingredients: recipeData.ingredients
        });

        if (createdRecipe) {
          return {
            ...createdRecipe,
            system_type: 'legacy' as RecipeSystemType
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error creating recipe via router:', error);
      throw error;
    }
  },

  /**
   * Update a recipe, routing to the correct system
   */
  async updateRecipe(recipeId: string, recipeData: Omit<CreateRecipeRequest, 'store_id' | 'target_system'>): Promise<NormalizedRecipe | null> {
    try {
      const systemInfo = await recipeSystemDetection.detectRecipeSystem(recipeId);
      
      if (!systemInfo) {
        throw new Error('Recipe not found in any system');
      }

      let updatedRecipe = null;

      if (systemInfo.type === 'unified') {
        updatedRecipe = await unifiedRecipeService.updateRecipe(recipeId, {
          name: recipeData.name,
          ingredients: recipeData.ingredients
        });

        if (updatedRecipe) {
          return {
            ...updatedRecipe,
            system_type: 'unified' as RecipeSystemType
          };
        }
      } else {
        updatedRecipe = await legacyRecipeService.updateRecipe(recipeId, {
          name: recipeData.name,
          instructions: recipeData.instructions,
          serving_size: recipeData.serving_size,
          ingredients: recipeData.ingredients
        });

        if (updatedRecipe) {
          return {
            ...updatedRecipe,
            system_type: 'legacy' as RecipeSystemType
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error updating recipe via router:', error);
      throw error;
    }
  },

  /**
   * Delete a recipe, routing to the correct system
   */
  async deleteRecipe(recipeId: string): Promise<boolean> {
    try {
      const systemInfo = await recipeSystemDetection.detectRecipeSystem(recipeId);
      
      if (!systemInfo) {
        toast.error('Recipe not found');
        return false;
      }

      if (systemInfo.type === 'unified') {
        return await unifiedRecipeService.deleteRecipe(recipeId);
      } else {
        return await legacyRecipeService.deleteRecipe(recipeId);
      }
    } catch (error) {
      console.error('Error deleting recipe via router:', error);
      return false;
    }
  },

  /**
   * Search recipes across both systems
   */
  async searchRecipes(storeId: string, searchTerm: string): Promise<NormalizedRecipe[]> {
    try {
      const [unifiedResults, legacyResults] = await Promise.all([
        unifiedRecipeService.searchRecipes(storeId, searchTerm),
        legacyRecipeService.searchRecipes(storeId, searchTerm)
      ]);

      const normalizedResults: NormalizedRecipe[] = [];

      // Add unified results
      unifiedResults.forEach(recipe => {
        normalizedResults.push({
          ...recipe,
          system_type: 'unified' as RecipeSystemType
        });
      });

      // Add legacy results
      legacyResults.forEach(recipe => {
        normalizedResults.push({
          ...recipe,
          system_type: 'legacy' as RecipeSystemType
        });
      });

      return normalizedResults.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error searching recipes via router:', error);
      return [];
    }
  },

  /**
   * Get system statistics for admin monitoring
   */
  async getSystemStatistics() {
    return await recipeSystemDetection.getSystemStatistics();
  }
};