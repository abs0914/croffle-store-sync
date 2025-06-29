
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ParsedConversionRecipe } from "@/utils/conversionRecipeParser";

export const bulkUploadConversionRecipes = async (
  conversionRecipes: ParsedConversionRecipe[]
): Promise<boolean> => {
  try {
    console.log('Starting bulk upload of conversion recipes:', conversionRecipes.length);

    // Get all commissary inventory items for matching
    const { data: commissaryItems, error: commissaryError } = await supabase
      .from('commissary_inventory')
      .select('id, name, unit, current_stock')
      .eq('is_active', true);

    if (commissaryError) {
      console.error('Error fetching commissary inventory:', commissaryError);
      throw commissaryError;
    }

    const commissaryMap = new Map();
    commissaryItems?.forEach(item => {
      commissaryMap.set(item.name.toLowerCase(), item);
    });

    let successCount = 0;
    let skipCount = 0;
    const missingIngredients = new Set<string>();
    const processedRecipes: ParsedConversionRecipe[] = [];

    // First pass: identify missing ingredients and mark them
    for (const recipe of conversionRecipes) {
      const updatedInputItems = recipe.input_items.map(inputItem => {
        const commissaryItem = commissaryMap.get(inputItem.commissary_item_name.toLowerCase());
        if (!commissaryItem) {
          missingIngredients.add(inputItem.commissary_item_name);
          return { ...inputItem, is_missing: true };
        }
        return inputItem;
      });

      // Only process recipes that have at least one valid ingredient
      const validIngredients = updatedInputItems.filter(item => !item.is_missing);
      if (validIngredients.length > 0) {
        processedRecipes.push({
          ...recipe,
          input_items: validIngredients // Only include valid ingredients
        });
      } else {
        console.warn(`Skipping recipe "${recipe.name}" - no valid ingredients found`);
        skipCount++;
      }
    }

    // Show warning about missing ingredients but continue processing
    if (missingIngredients.size > 0) {
      const missingList = Array.from(missingIngredients).join(', ');
      console.warn('Missing ingredients (will be skipped):', missingList);
      toast.warning(`Some ingredients not found in commissary inventory and will be skipped: ${missingList}`);
    }

    if (processedRecipes.length === 0) {
      toast.error('No valid conversion recipes to process');
      return false;
    }

    // Process each recipe
    for (const recipe of processedRecipes) {
      try {
        // Create the conversion recipe
        const { data: conversionRecipe, error: recipeError } = await supabase
          .from('conversion_recipes')
          .insert({
            name: recipe.name,
            description: recipe.description,
            finished_item_name: recipe.output_item.name,
            finished_item_unit: recipe.output_item.uom,
            yield_quantity: recipe.output_item.quantity,
            instructions: `Convert ${recipe.input_items.map(i => `${i.quantity} ${i.unit} ${i.commissary_item_name}`).join(', ')} into ${recipe.output_item.quantity} ${recipe.output_item.uom} ${recipe.output_item.name}`,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            is_active: true
          })
          .select()
          .single();

        if (recipeError) {
          console.error(`Error creating recipe "${recipe.name}":`, recipeError);
          continue;
        }

        // Create recipe ingredients (only for valid ingredients)
        const ingredientInserts = recipe.input_items
          .filter(inputItem => !inputItem.is_missing)
          .map(inputItem => {
            const commissaryItem = commissaryMap.get(inputItem.commissary_item_name.toLowerCase());
            return {
              conversion_recipe_id: conversionRecipe.id,
              commissary_item_id: commissaryItem.id,
              quantity: inputItem.quantity
            };
          });

        if (ingredientInserts.length > 0) {
          const { error: ingredientsError } = await supabase
            .from('conversion_recipe_ingredients')
            .insert(ingredientInserts);

          if (ingredientsError) {
            console.error(`Error creating ingredients for recipe "${recipe.name}":`, ingredientsError);
            continue;
          }
        }

        // Create the finished product in commissary inventory
        const { error: productError } = await supabase
          .from('commissary_inventory')
          .insert({
            name: recipe.output_item.name,
            category: recipe.output_item.category,
            item_type: 'orderable_item',
            current_stock: 0,
            minimum_threshold: 10,
            unit: recipe.output_item.uom,
            unit_cost: recipe.output_item.unit_cost || 0,
            sku: recipe.output_item.sku || `FP-${recipe.output_item.name.toUpperCase().replace(/\s+/g, '-')}`,
            storage_location: recipe.output_item.storage_location || 'Finished Goods',
            is_active: true
          });

        if (productError) {
          console.error(`Error creating finished product "${recipe.output_item.name}":`, productError);
          // Continue processing other recipes even if this one fails
        }

        successCount++;
        console.log(`Successfully processed recipe: ${recipe.name}`);

      } catch (recipeError) {
        console.error(`Error processing recipe "${recipe.name}":`, recipeError);
        continue;
      }
    }

    const totalProcessed = successCount + skipCount;
    
    if (successCount > 0) {
      toast.success(`Successfully created ${successCount} conversion recipe(s)${skipCount > 0 ? ` (${skipCount} skipped due to missing ingredients)` : ''}`);
    } else {
      toast.error('No conversion recipes could be created');
    }

    return successCount > 0;

  } catch (error) {
    console.error('Error in bulk upload conversion recipes:', error);
    toast.error('Failed to process conversion recipes');
    return false;
  }
};
