
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";
import { UploadData, getUnitMapping, getValidUnits } from "./recipeUploadHelpers";

export const processRecipeIngredients = async (
  recipe: RecipeUpload,
  recipeId: string,
  productId: string,
  uploadData: UploadData
): Promise<boolean> => {
  const unitMapping = getUnitMapping();
  const validUnits = getValidUnits();
  const ingredientInserts = [];

  for (const ingredient of recipe.ingredients) {
    const commissaryItem = uploadData.commissaryMap.get(ingredient.commissary_item_name.toLowerCase());
    
    if (!commissaryItem) {
      console.warn(`Ingredient "${ingredient.commissary_item_name}" not found in commissary inventory`);
      continue;
    }

    // Try to find or create store inventory item
    const storeInventoryItem = await findOrCreateStoreInventoryItem(
      ingredient,
      commissaryItem,
      uploadData.storeInventoryMap,
      unitMapping,
      uploadData.storeId // Pass the store ID from uploadData
    );

    if (!storeInventoryItem) {
      console.error(`Failed to create/find store inventory item for ${ingredient.commissary_item_name}`);
      continue;
    }

    // Ensure unit is mapped to valid enum value
    const mappedUnit = unitMapping[ingredient.uom.toLowerCase()] || ingredient.uom; // Use uom instead of unit
    const finalUnit = validUnits.includes(mappedUnit) ? mappedUnit : 'pieces';
    
    ingredientInserts.push({
      recipe_id: recipeId,
      commissary_item_id: commissaryItem.id,
      inventory_stock_id: storeInventoryItem.id,
      quantity: ingredient.quantity,
      unit: finalUnit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
      cost_per_unit: ingredient.cost_per_unit || commissaryItem.unit_cost || 0
    });
  }

  if (ingredientInserts.length === 0) {
    console.warn(`No valid ingredients found for recipe ${recipe.name}`);
    return false;
  }

  // Insert ingredients
  const { error: ingredientsError } = await supabase
    .from('recipe_ingredients')
    .insert(ingredientInserts);

  if (ingredientsError) {
    console.error(`Error adding ingredients for recipe ${recipe.name}:`, ingredientsError);
    return false;
  }

  // Update product with calculated cost
  await updateProductCost(productId, ingredientInserts);
  return true;
};

const findOrCreateStoreInventoryItem = async (
  ingredient: any,
  commissaryItem: any,
  storeInventoryMap: Map<string, any>,
  unitMapping: Record<string, string>,
  storeId: string
): Promise<any> => {
  // First check if we have a standardized version of this ingredient
  const { data: standardizedIngredient } = await supabase
    .from('standardized_ingredients')
    .select('*')
    .eq('ingredient_name', ingredient.commissary_item_name.toLowerCase())
    .single();

  // Use standardized values if available, otherwise fallback to original
  const itemName = standardizedIngredient?.standardized_name || ingredient.commissary_item_name;
  const itemUnit = standardizedIngredient?.standardized_unit || (unitMapping[ingredient.uom.toLowerCase()] || ingredient.uom);
  const itemCategory = standardizedIngredient?.category || 'base_ingredient';

  // Check if item already exists in store
  const existingItem = storeInventoryMap.get(itemName.toLowerCase());
  if (existingItem) {
    return existingItem;
  }

  // Create new store inventory item with standardized values
  console.log('Creating standardized inventory stock item:', {
    store_id: storeId,
    item: itemName,
    unit: itemUnit,
    category: itemCategory
  });
  
  const { data: newStoreItem, error: storeItemError } = await supabase
    .from('inventory_stock')
    .insert({
      store_id: storeId,
      item: itemName,
      unit: itemUnit,
      item_category: itemCategory as 'packaging' | 'base_ingredient' | 'classic_sauce' | 'premium_sauce' | 'classic_topping' | 'premium_topping' | 'biscuit',
      stock_quantity: 0,
      cost: ingredient.cost_per_unit || commissaryItem.unit_cost || 0,
      is_active: true,
      recipe_compatible: true
    })
    .select()
    .single();

  if (storeItemError) {
    console.error(`Error creating store inventory item for ${itemName}:`, storeItemError);
    return null;
  }
  
  // Add to map using standardized name
  storeInventoryMap.set(itemName.toLowerCase(), newStoreItem);
  return newStoreItem;
};

const updateProductCost = async (productId: string, ingredientInserts: any[]): Promise<void> => {
  const totalCost = ingredientInserts.reduce((sum, ingredient) => {
    return sum + (ingredient.quantity * ingredient.cost_per_unit);
  }, 0);

  const suggestedPrice = totalCost; // Use cost as base price without markup
  
  await supabase
    .from('products')
    .update({
      cost: totalCost,
      price: suggestedPrice
    })
    .eq('id', productId);
};
