
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

    // Get existing categories for the store
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('is_active', true);

    const categoryMap = new Map(existingCategories?.map(cat => [cat.name.toLowerCase(), cat]) || []);

    // Get store inventory items for the specific store
    const { data: storeInventoryItems } = await supabase
      .from('inventory_stock')
      .select('id, item, store_id')
      .eq('store_id', storeId)
      .eq('is_active', true);

    const storeInventoryMap = new Map(storeInventoryItems?.map(item => [item.item.toLowerCase(), item]) || []);

    let successCount = 0;
    let errorCount = 0;

    // Enhanced unit mapping to ensure valid database enum values
    const unitMapping: Record<string, string> = {
      'piece': 'pieces',
      'serving': 'g',
      'portion': 'g',
      'scoop': 'g',
      'pair': 'pieces',
      'gram': 'g',
      'grams': 'g',
      'kilogram': 'kg',
      'kilograms': 'kg',
      'liter': 'liters',
      'litre': 'liters',
      'milliliter': 'ml',
      'millilitre': 'ml',
      'box': 'boxes',
      'pack': 'packs',
      'package': 'packs'
    };

    for (const recipe of recipes) {
      try {
        // Handle category creation if provided
        let categoryId: string | undefined;
        if (recipe.category) {
          const existingCategory = categoryMap.get(recipe.category.toLowerCase());
          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            // Create new category
            const { data: newCategory, error: categoryError } = await supabase
              .from('categories')
              .insert({
                name: recipe.category,
                description: `Category for ${recipe.category} items`,
                store_id: storeId,
                is_active: true
              })
              .select()
              .single();

            if (categoryError) {
              console.error(`Error creating category ${recipe.category}:`, categoryError);
            } else {
              categoryId = newCategory.id;
              categoryMap.set(recipe.category.toLowerCase(), newCategory);
            }
          }
        }

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
          
          // Update existing product with category if provided
          if (categoryId) {
            await supabase
              .from('products')
              .update({ category_id: categoryId })
              .eq('id', existingProduct.id);
          }
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
              category_id: categoryId,
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

        // Add ingredients with proper inventory references
        const ingredientInserts = [];
        
        for (const ingredient of recipe.ingredients) {
          const commissaryItem = commissaryMap.get(ingredient.commissary_item_name.toLowerCase());
          
          if (!commissaryItem) {
            console.warn(`Ingredient "${ingredient.commissary_item_name}" not found in commissary inventory`);
            continue;
          }

          // Try to find a corresponding store inventory item, or create one if needed
          let storeInventoryItem = storeInventoryMap.get(ingredient.commissary_item_name.toLowerCase());
          
          if (!storeInventoryItem) {
            // Create a store inventory item for this ingredient
            const { data: newStoreItem, error: storeItemError } = await supabase
              .from('inventory_stock')
              .insert({
                store_id: storeId,
                item: ingredient.commissary_item_name,
                unit: unitMapping[ingredient.unit.toLowerCase()] || ingredient.unit,
                stock_quantity: 0,
                cost: ingredient.cost_per_unit || commissaryItem.unit_cost || 0,
                is_active: true
              })
              .select()
              .single();

            if (storeItemError) {
              console.error(`Error creating store inventory item for ${ingredient.commissary_item_name}:`, storeItemError);
              continue;
            }
            
            storeInventoryItem = newStoreItem;
            storeInventoryMap.set(ingredient.commissary_item_name.toLowerCase(), newStoreItem);
          }

          // Ensure unit is mapped to valid enum value
          const mappedUnit = unitMapping[ingredient.unit.toLowerCase()] || ingredient.unit;
          
          // Validate the unit is one of the allowed enum values
          const validUnits = ['kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs'];
          const finalUnit = validUnits.includes(mappedUnit) ? mappedUnit : 'pieces';
          
          ingredientInserts.push({
            recipe_id: recipeData.id,
            commissary_item_id: commissaryItem.id,
            inventory_stock_id: storeInventoryItem.id,
            quantity: ingredient.quantity,
            unit: finalUnit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
            cost_per_unit: ingredient.cost_per_unit || commissaryItem.unit_cost || 0
          });
        }

        if (ingredientInserts.length > 0) {
          const { error: ingredientsError } = await supabase
            .from('recipe_ingredients')
            .insert(ingredientInserts);

          if (ingredientsError) {
            console.error(`Error adding ingredients for recipe ${recipe.name}:`, ingredientsError);
            errorCount++;
          } else {
            // Calculate total recipe cost and update the product
            const totalCost = ingredientInserts.reduce((sum, ingredient) => {
              return sum + (ingredient.quantity * ingredient.cost_per_unit);
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
        } else {
          console.warn(`No valid ingredients found for recipe ${recipe.name}`);
          errorCount++;
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
