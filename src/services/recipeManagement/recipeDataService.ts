
import { supabase } from "@/integrations/supabase/client";
import { RecipeTemplate } from "./types";

export const getRecipeTemplates = async (): Promise<RecipeTemplate[]> => {
  try {
    console.log('Fetching recipe templates...');
    
    const { data, error } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        recipe_template_ingredients (*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipe templates:', error);
      throw error;
    }
    
    console.log('Fetched recipe templates:', data?.length || 0);
    
    return (data || []).map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category_name: template.category_name,
      instructions: template.instructions,
      yield_quantity: template.yield_quantity,
      serving_size: template.serving_size,
      version: template.version || 1,
      is_active: template.is_active || true,
      created_by: template.created_by || 'system',
      created_at: template.created_at,
      updated_at: template.updated_at,
      ingredients: (template.recipe_template_ingredients || []).map((ing: any) => ({
        id: ing.id,
        recipe_template_id: template.id,
        commissary_item_id: ing.commissary_item_id,
        commissary_item_name: ing.commissary_item_name,
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

export const getDeployedRecipes = async (): Promise<any[]> => {
  try {
    console.log('Fetching deployed recipes from database...');
    
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          *,
          inventory_stock (*)
        ),
        stores:store_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching deployed recipes:', error);
      throw error;
    }
    
    console.log('Successfully fetched deployed recipes:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('Sample deployed recipe:', {
        id: data[0].id,
        name: data[0].name,
        store_id: data[0].store_id,
        ingredients_count: data[0].recipe_ingredients?.length || 0,
        approval_status: data[0].approval_status,
        is_active: data[0].is_active
      });
    }
    
    return data || [];
  } catch (error: any) {
    console.error('Error fetching deployed recipes:', error);
    return [];
  }
};
