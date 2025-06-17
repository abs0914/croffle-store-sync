
import { supabase } from "@/integrations/supabase/client";
import { RecipeTemplate } from "./types";

export const getRecipeTemplates = async (): Promise<RecipeTemplate[]> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          id,
          quantity,
          unit,
          cost_per_unit,
          commissary_item_id,
          inventory_stock_id,
          created_at
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      category_name: undefined, // recipes table doesn't have category_name
      instructions: recipe.instructions,
      yield_quantity: recipe.yield_quantity,
      serving_size: recipe.serving_size,
      version: recipe.version || 1,
      is_active: recipe.is_active || true,
      created_by: 'system', // recipes table doesn't have created_by
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
      ingredients: (recipe.recipe_ingredients || []).map((ing: any) => ({
        id: ing.id,
        recipe_template_id: recipe.id,
        commissary_item_name: 'Unknown Item',
        quantity: ing.quantity,
        unit: ing.unit,
        cost_per_unit: ing.cost_per_unit,
        created_at: ing.created_at
      }))
    })) as RecipeTemplate[];
  } catch (error: any) {
    console.error('Error fetching recipe templates:', error);
    return [];
  }
};
