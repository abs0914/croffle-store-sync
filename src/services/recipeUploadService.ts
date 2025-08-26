
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecipeUploadData {
  name: string;
  category: string;
  ingredients: Array<{
    ingredient_name: string;
    unit: string;
    quantity: number;
    cost_per_unit: number;
  }>;
  recipe_type?: string;
  description?: string;
  preparation_time?: number;
  serving_size?: number;
}

export const bulkUploadRecipes = async (recipes: RecipeUploadData[]): Promise<boolean> => {
  try {
    console.log('Starting bulk recipe upload:', recipes.length, 'recipes');

    for (const recipe of recipes) {
      console.log('Processing recipe:', recipe.name);

      // Determine recipe type based on category if not provided
      const recipeType = recipe.recipe_type || determineRecipeType(recipe.category);
      
      // Generate unique SKU
      const { data: skuData, error: skuError } = await supabase
        .rpc('generate_recipe_sku', {
          recipe_name: recipe.name,
          recipe_type: recipeType
        });

      if (skuError) {
        console.error('Error generating SKU:', skuError);
        toast.error(`Failed to generate SKU for ${recipe.name}`);
        continue;
      }

      // Calculate total cost from ingredients
      const totalCost = recipe.ingredients.reduce((sum, ingredient) => {
        return sum + (ingredient.quantity * ingredient.cost_per_unit);
      }, 0);

      // Create recipe template
      const { data: templateData, error: templateError } = await supabase
        .from('recipe_templates')
        .insert({
          name: recipe.name,
          recipe_type: recipeType,
          category: recipe.category,
          description: recipe.description || `Delicious ${recipe.name}`,
          sku: skuData,
          total_cost: totalCost,
          suggested_price: totalCost * 1.5, // 50% markup as default
          preparation_time: recipe.preparation_time || 10,
          serving_size: recipe.serving_size || 1,
          is_active: true
        })
        .select()
        .single();

      if (templateError) {
        console.error('Error creating recipe template:', templateError);
        toast.error(`Failed to create template for ${recipe.name}`);
        continue;
      }

      console.log('Created template:', templateData.id);

      // Add ingredients to template
      const ingredientInserts = recipe.ingredients.map(ingredient => ({
        recipe_template_id: templateData.id,
        ingredient_name: ingredient.ingredient_name,
        unit: ingredient.unit,
        quantity: ingredient.quantity,
        cost_per_unit: ingredient.cost_per_unit
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .insert(ingredientInserts);

      if (ingredientsError) {
        console.error('Error adding ingredients:', ingredientsError);
        toast.error(`Failed to add ingredients for ${recipe.name}`);
        
        // Clean up template if ingredients failed
        await supabase
          .from('recipe_templates')
          .delete()
          .eq('id', templateData.id);
        continue;
      }

      console.log('Added ingredients for:', recipe.name);
    }

    toast.success(`Successfully uploaded ${recipes.length} recipe templates!`);
    return true;

  } catch (error) {
    console.error('Bulk upload error:', error);
    toast.error('Failed to upload recipes');
    return false;
  }
};

const determineRecipeType = (category: string): string => {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('addon') || categoryLower.includes('extra')) {
    return 'addon';
  } else if (categoryLower.includes('combo') || categoryLower.includes('overload')) {
    return 'combo';
  } else if (categoryLower.includes('beverage') || categoryLower.includes('drink') || 
             categoryLower.includes('coffee') || categoryLower.includes('tea')) {
    return 'beverage';
  } else {
    return 'regular';
  }
};

// Function to validate recipe deployment before attempting
export const validateRecipeDeployment = async (
  templateId: string, 
  storeId: string
): Promise<{
  isValid: boolean;
  errorMessage?: string;
  missingIngredients?: string[];
}> => {
  try {
    const { data, error } = await supabase
      .rpc('validate_recipe_deployment', {
        template_id_param: templateId,
        store_id_param: storeId
      });

    if (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errorMessage: 'Failed to validate recipe deployment'
      };
    }

    const result = data[0];
    return {
      isValid: result.is_valid,
      errorMessage: result.error_message,
      missingIngredients: result.missing_ingredients
    };

  } catch (error) {
    console.error('Validation error:', error);
    return {
      isValid: false,
      errorMessage: 'Failed to validate recipe deployment'
    };
  }
};
