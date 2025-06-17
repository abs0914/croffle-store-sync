
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";
import { toast } from "sonner";

export const bulkUploadRecipes = async (recipes: RecipeUpload[], storeId: string): Promise<boolean> => {
  try {
    // Get commissary inventory for ingredient matching
    const { data: commissaryItems } = await supabase
      .from('commissary_inventory')
      .select('id, name, unit_cost')
      .eq('is_active', true);

    const commissaryMap = new Map(commissaryItems?.map(item => [item.name.toLowerCase(), item]) || []);

    let successCount = 0;
    let errorCount = 0;

    for (const recipe of recipes) {
      try {
        // Create the recipe first
        const { data: recipeData, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            name: recipe.name,
            description: recipe.description,
            yield_quantity: recipe.yield_quantity,
            serving_size: recipe.serving_size,
            instructions: recipe.instructions,
            store_id: storeId,
            product_id: '00000000-0000-0000-0000-000000000000', // Placeholder until linked to actual product
            is_active: true
          })
          .select()
          .single();

        if (recipeError) {
          console.error(`Error creating recipe ${recipe.name}:`, recipeError);
          errorCount++;
          continue;
        }

        // Add ingredients
        const ingredientInserts = recipe.ingredients.map(ingredient => {
          const commissaryItem = commissaryMap.get(ingredient.commissary_item_name.toLowerCase());
          
          if (!commissaryItem) {
            console.warn(`Ingredient "${ingredient.commissary_item_name}" not found in commissary inventory`);
          }
          
          return {
            recipe_id: recipeData.id,
            commissary_item_id: commissaryItem?.id,
            inventory_stock_id: '00000000-0000-0000-0000-000000000000', // Placeholder
            quantity: ingredient.quantity,
            unit: ingredient.unit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
            cost_per_unit: ingredient.cost_per_unit || commissaryItem?.unit_cost || 0
          };
        });

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) {
          console.error(`Error adding ingredients for recipe ${recipe.name}:`, ingredientsError);
          errorCount++;
        } else {
          successCount++;
        }

      } catch (error) {
        console.error(`Error processing recipe ${recipe.name}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} recipes${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
    }
    
    if (errorCount > 0 && successCount === 0) {
      toast.error(`Failed to upload recipes. Please check that ingredient names match items in commissary inventory.`);
      return false;
    }

    return successCount > 0;
  } catch (error) {
    console.error('Error bulk uploading recipes:', error);
    toast.error('Failed to upload recipes');
    return false;
  }
};
