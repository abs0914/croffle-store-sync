
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecipeUploadData {
  name: string;
  category: string;
  ingredients: {
    name: string;
    uom: string; // Changed from unit to uom
    quantity: number;
    cost?: number;
  }[];
}

export const bulkUploadRecipes = async (recipes: RecipeUploadData[]): Promise<boolean> => {
  try {
    console.log('Starting bulk recipe upload:', recipes);
    
    // Create recipe templates (centralized templates, not store-specific)
    const recipeTemplateInserts = recipes.map(recipe => ({
      name: recipe.name,
      category_name: recipe.category,
      description: `${recipe.category} recipe template`,
      yield_quantity: 1,
      serving_size: 1,
      instructions: 'Instructions to be added',
      is_active: true,
      created_at: new Date().toISOString()
    }));

    const { data: insertedTemplates, error: templateError } = await supabase
      .from('recipe_templates')
      .insert(recipeTemplateInserts)
      .select('id, name');

    if (templateError) {
      console.error('Error inserting recipe templates:', templateError);
      toast.error('Failed to create recipe templates');
      return false;
    }

    console.log('Created recipe templates:', insertedTemplates);

    // Create recipe template ingredients for each template
    const ingredientInserts: any[] = [];
    
    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const insertedTemplate = insertedTemplates[i];
      
      for (const ingredient of recipe.ingredients) {
        // Try to find matching commissary item by name
        const { data: commissaryItems } = await supabase
          .from('commissary_inventory')
          .select('id')
          .eq('name', ingredient.name)
          .limit(1);

        const commissaryItemId = commissaryItems?.[0]?.id || null;

        ingredientInserts.push({
          recipe_template_id: insertedTemplate.id,
          commissary_item_name: ingredient.name,
          commissary_item_id: commissaryItemId,
          unit: ingredient.uom, // Use uom as unit for database compatibility
          quantity: ingredient.quantity,
          cost_per_unit: ingredient.cost || 0
        });
      }
    }

    if (ingredientInserts.length > 0) {
      const { error: ingredientError } = await supabase  
        .from('recipe_template_ingredients')
        .insert(ingredientInserts);

      if (ingredientError) {
        console.error('Error inserting recipe template ingredients:', ingredientError);
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
