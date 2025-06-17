
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";

export const createRecipe = async (
  recipe: RecipeUpload,
  storeId: string,
  productId: string
): Promise<any> => {
  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      name: recipe.name,
      description: recipe.description,
      yield_quantity: recipe.yield_quantity,
      serving_size: recipe.serving_size,
      instructions: recipe.instructions,
      store_id: storeId,
      product_id: productId,
      is_active: true
    })
    .select()
    .single();

  if (recipeError) {
    throw new Error(`Error creating recipe ${recipe.name}: ${recipeError.message}`);
  }

  return recipeData;
};
