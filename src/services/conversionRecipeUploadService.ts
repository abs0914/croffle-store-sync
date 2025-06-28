
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConversionRecipeUpload } from "@/utils/csvParser";

export const bulkUploadConversionRecipes = async (recipes: ConversionRecipeUpload[]): Promise<boolean> => {
  try {
    console.log('Starting bulk upload of conversion recipes:', recipes);
    
    // Get commissary items for validation - check both possible table names
    let commissaryItems: any[] = [];
    let commissaryMap = new Map();
    
    // Try commissary_inventory first
    const { data: commissaryData, error: commissaryError } = await supabase
      .from('commissary_inventory')
      .select('id, name')
      .eq('is_active', true);

    if (!commissaryError && commissaryData) {
      commissaryItems = commissaryData;
      commissaryMap = new Map(commissaryItems.map(item => [item.name.toLowerCase().trim(), item]));
      console.log('Available commissary items:', commissaryItems.map(item => item.name));
    } else {
      // Try inventory_items as fallback
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, name')
        .eq('is_active', true);

      if (!inventoryError && inventoryData) {
        commissaryItems = inventoryData;
        commissaryMap = new Map(commissaryItems.map(item => [item.name.toLowerCase().trim(), item]));
        console.log('Available inventory items:', commissaryItems.map(item => item.name));
      } else {
        toast.error('Failed to load inventory items for validation');
        return false;
      }
    }

    const validRecipes = [];
    const errors = [];

    // Validate each recipe
    for (const recipe of recipes) {
      const inputItemKey = recipe.input_item_name.toLowerCase().trim();
      let inventoryItem = commissaryMap.get(inputItemKey);
      
      console.log(`Looking for input item: "${recipe.input_item_name}" (normalized: "${inputItemKey}")`);
      
      if (!inventoryItem) {
        console.log(`Input item "${recipe.input_item_name}" not found in inventory`);
        console.log('Available items:', Array.from(commissaryMap.keys()));
        
        // Try partial matching as fallback
        let foundItem = null;
        for (const [key, item] of commissaryMap.entries()) {
          if (key.includes(inputItemKey) || inputItemKey.includes(key)) {
            foundItem = item;
            console.log(`Found partial match: "${item.name}" for "${recipe.input_item_name}"`);
            break;
          }
        }
        
        if (!foundItem) {
          errors.push(`Input item "${recipe.input_item_name}" not found in inventory. Available items: ${Array.from(commissaryMap.keys()).join(', ')}`);
          continue;
        } else {
          inventoryItem = foundItem;
        }
      }

      validRecipes.push({
        ...recipe,
        commissary_item_id: inventoryItem.id
      });
    }

    if (validRecipes.length === 0) {
      console.log('No valid conversion recipes found after validation');
      console.log('Errors:', errors);
      toast.error('No valid conversion recipes found. Please check that input items exist in inventory.');
      errors.forEach(error => console.error(error));
      return false;
    }

    console.log(`Found ${validRecipes.length} valid recipes out of ${recipes.length} total`);

    // Get current user for created_by field
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData.user?.id;

    if (!currentUserId) {
      toast.error('Authentication required');
      return false;
    }

    // Create conversion recipe templates
    const conversionRecipeInserts = validRecipes.map(recipe => ({
      name: recipe.name,
      description: recipe.description,
      finished_item_name: recipe.output_product_name,
      finished_item_unit: recipe.output_unit,
      yield_quantity: recipe.output_quantity,
      instructions: recipe.instructions,
      is_active: true,
      created_by: currentUserId
    }));

    const { data: insertedRecipes, error: recipeError } = await supabase
      .from('conversion_recipes')
      .insert(conversionRecipeInserts)
      .select('id, name');

    if (recipeError) {
      console.error('Error inserting conversion recipes:', recipeError);
      toast.error('Failed to create conversion recipes');
      return false;
    }

    if (!insertedRecipes || insertedRecipes.length === 0) {
      toast.error('No conversion recipes were created');
      return false;
    }

    console.log('Created conversion recipes:', insertedRecipes);

    // Create conversion recipe ingredients with proper foreign key reference
    const ingredientInserts = [];
    
    for (let i = 0; i < validRecipes.length; i++) {
      const recipe = validRecipes[i];
      const insertedRecipe = insertedRecipes[i];
      
      if (insertedRecipe && recipe.commissary_item_id) {
        ingredientInserts.push({
          conversion_recipe_id: insertedRecipe.id,
          commissary_item_id: recipe.commissary_item_id,
          quantity: recipe.input_quantity,
          unit: recipe.input_unit
        });
      }
    }

    if (ingredientInserts.length > 0) {
      const { error: ingredientError } = await supabase
        .from('conversion_recipe_ingredients')
        .insert(ingredientInserts);

      if (ingredientError) {
        console.error('Error inserting conversion recipe ingredients:', ingredientError);
        toast.error('Failed to add ingredients to conversion recipes');
        return false;
      }
    }

    console.log('Conversion recipes created successfully');

    if (errors.length > 0) {
      toast.warning(`Created ${validRecipes.length} conversion recipes. ${errors.length} items skipped due to missing inventory items.`);
      console.warn('Conversion recipe upload errors:', errors);
    } else {
      toast.success(`Successfully created ${validRecipes.length} conversion recipe templates`);
    }

    return true;

  } catch (error) {
    console.error('Bulk upload error:', error);
    toast.error('Failed to upload conversion recipes');
    return false;
  }
};
