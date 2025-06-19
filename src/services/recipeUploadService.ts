
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecipeUploadData {
  name: string;
  category: string;
  ingredients: {
    name: string;
    unit: string;
    quantity: number;
    cost?: number;
  }[];
}

export const bulkUploadRecipes = async (recipes: RecipeUploadData[]): Promise<boolean> => {
  try {
    console.log('Starting bulk recipe upload:', recipes);
    
    // Create recipe templates (no store_id)
    const recipeInserts = recipes.map(recipe => ({
      name: recipe.name,
      category: recipe.category,
      description: `${recipe.category} recipe`,
      yield_quantity: 1,
      serving_size: '1 serving',
      instructions: 'Instructions to be added',
      is_template: true, // Mark as template
      created_at: new Date().toISOString()
    }));

    const { data: insertedRecipes, error: recipeError } = await supabase
      .from('recipes')
      .insert(recipeInserts)
      .select('id, name');

    if (recipeError) {
      console.error('Error inserting recipes:', recipeError);
      toast.error('Failed to create recipe templates');
      return false;
    }

    console.log('Created recipe templates:', insertedRecipes);

    // Create recipe ingredients for each template
    const ingredientInserts: any[] = [];
    
    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const insertedRecipe = insertedRecipes[i];
      
      for (const ingredient of recipe.ingredients) {
        ingredientInserts.push({
          recipe_id: insertedRecipe.id,
          ingredient_name: ingredient.name,
          unit_of_measure: ingredient.unit,
          quantity_used: ingredient.quantity,
          cost_per_unit: ingredient.cost || 0,
          total_cost: (ingredient.cost || 0) * ingredient.quantity
        });
      }
    }

    if (ingredientInserts.length > 0) {
      const { error: ingredientError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientInserts);

      if (ingredientError) {
        console.error('Error inserting recipe ingredients:', ingredientError);
        toast.error('Failed to add ingredients to recipe templates');
        return false;
      }
    }

    toast.success(`Successfully created ${recipes.length} recipe templates`);
    return true;

  } catch (error) {
    console.error('Bulk upload error:', error);
    toast.error('Failed to upload recipes');
    return false;
  }
};
