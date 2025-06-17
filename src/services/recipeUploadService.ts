
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
        // First, create or find a matching product for this recipe
        let productId: string;
        
        // Check if a product with this name already exists
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('store_id', storeId)
          .eq('name', recipe.name)
          .eq('is_active', true)
          .maybeSingle();

        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          // Create a new product for this recipe
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert({
              name: recipe.name,
              description: recipe.description || `Product for ${recipe.name}`,
              price: 0, // Will be calculated from recipe cost
              cost: 0, // Will be calculated from recipe ingredients
              stock_quantity: 0,
              store_id: storeId,
              sku: `RECIPE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              is_active: true
            })
            .select()
            .single();

          if (productError) {
            console.error(`Error creating product for recipe ${recipe.name}:`, productError);
            errorCount++;
            continue;
          }

          productId = newProduct.id;
        }

        // Create the recipe with the valid product_id
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
          // Calculate total recipe cost and update the product
          const totalCost = recipe.ingredients.reduce((sum, ingredient) => {
            const commissaryItem = commissaryMap.get(ingredient.commissary_item_name.toLowerCase());
            const costPerUnit = ingredient.cost_per_unit || commissaryItem?.unit_cost || 0;
            return sum + (ingredient.quantity * costPerUnit);
          }, 0);

          // Update product with calculated cost and suggested selling price
          const suggestedPrice = totalCost * 2.5; // 150% markup as example
          
          await supabase
            .from('products')
            .update({
              cost: totalCost,
              price: suggestedPrice
            })
            .eq('id', productId);

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
