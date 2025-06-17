
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";
import { UploadData, getUnitMapping, getValidUnits } from "./recipeUploadHelpers";
import { handleCategoryCreation } from "./categoryHandler";
import { createOrUpdateProduct } from "./productHandler";
import { createRecipe } from "./recipeHandler";
import { processRecipeIngredients } from "./ingredientHandler";

export const processRecipeUpload = async (
  recipe: RecipeUpload, 
  storeId: string, 
  uploadData: UploadData
): Promise<boolean> => {
  try {
    // Handle category creation if provided
    const categoryId = await handleCategoryCreation(recipe.category, storeId, uploadData.categoryMap);

    // Create or find a matching product for this recipe
    const productId = await createOrUpdateProduct(recipe, storeId, categoryId);

    // Create the recipe with the valid product_id
    const recipeData = await createRecipe(recipe, storeId, productId);

    // Process ingredients and update product cost
    const success = await processRecipeIngredients(recipe, recipeData.id, productId, uploadData);

    return success;
  } catch (error) {
    console.error(`Error in processRecipeUpload for ${recipe.name}:`, error);
    return false;
  }
};
