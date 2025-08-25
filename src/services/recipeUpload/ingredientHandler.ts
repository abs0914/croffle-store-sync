
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
  // During clean slate import, use the import data as the source of truth
  const itemName = ingredient.commissary_item_name;
  const itemUnit = unitMapping[ingredient.uom.toLowerCase()] || ingredient.uom;
  
  // Determine category based on ingredient name patterns
  const itemCategory = determineIngredientCategory(itemName);
  
  // Check if item already exists in store
  const existingItem = storeInventoryMap.get(itemName.toLowerCase());
  if (existingItem) {
    return existingItem;
  }

  // First check if we have a standardized version of this ingredient
  const { data: standardizedIngredient } = await supabase
    .from('standardized_ingredients')
    .select('*')
    .eq('ingredient_name', ingredient.commissary_item_name.toLowerCase())
    .maybeSingle();

  // Create standardized ingredient if it doesn't exist
  if (!standardizedIngredient) {
    await createStandardizedIngredient(itemName, itemName, itemUnit, itemCategory);
  }
  
  // Create new store inventory item using import data
  console.log('Creating inventory stock item from import data:', {
    store_id: storeId,
    item: itemName,
    unit: itemUnit,
    category: itemCategory,
    cost: ingredient.cost_per_unit || commissaryItem?.unit_cost || 0
  });
  
  const { data: newStoreItem, error: storeItemError } = await supabase
    .from('inventory_stock')
    .insert({
      store_id: storeId,
      item: itemName,
      unit: itemUnit,
      item_category: itemCategory as 'packaging' | 'base_ingredient' | 'classic_sauce' | 'premium_sauce' | 'classic_topping' | 'premium_topping' | 'biscuit',
      stock_quantity: 0,
      cost: ingredient.cost_per_unit || commissaryItem?.unit_cost || 0,
      is_active: true,
      recipe_compatible: true
    })
    .select()
    .single();

  if (storeItemError) {
    console.error(`Error creating store inventory item for ${itemName}:`, storeItemError);
    return null;
  }
  
  // Add to map using item name
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

// Helper function to determine ingredient category from name patterns
const determineIngredientCategory = (ingredientName: string): string => {
  const name = ingredientName.toLowerCase();
  
  // Packaging items
  if (name.includes('cup') || name.includes('lid') || name.includes('container') || 
      name.includes('wrapper') || name.includes('bag') || name.includes('box') || 
      name.includes('paper') || name.includes('packaging')) {
    return 'packaging';
  }
  
  // Sauces
  if (name.includes('sauce') || name.includes('syrup') || name.includes('caramel') || 
      name.includes('chocolate sauce') || name.includes('vanilla syrup')) {
    return name.includes('premium') || name.includes('specialty') ? 'premium_sauce' : 'classic_sauce';
  }
  
  // Toppings
  if (name.includes('sprinkle') || name.includes('flake') || name.includes('crushed') || 
      name.includes('topping') || name.includes('cream') || name.includes('jam')) {
    return name.includes('premium') || name.includes('specialty') || name.includes('biscoff') ? 'premium_topping' : 'classic_topping';
  }
  
  // Biscuits
  if (name.includes('biscuit') || name.includes('waffle') || name.includes('cookie')) {
    return 'biscuit';
  }
  
  // Default to base ingredient
  return 'base_ingredient';
};

// Helper function to create standardized ingredient
const createStandardizedIngredient = async (ingredientName: string, standardizedName: string, unit: string, category: string): Promise<void> => {
  const validUnits = ['kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs'];
  const standardizedUnit = validUnits.includes(unit.toLowerCase()) ? unit.toLowerCase() : 'pieces';
  
  try {
    await supabase
      .from('standardized_ingredients')
      .insert({
        ingredient_name: ingredientName.toLowerCase(),
        standardized_name: standardizedName,
        standardized_unit: standardizedUnit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
        category: category
      });
    console.log(`Created standardized ingredient: ${standardizedName}`);
  } catch (error) {
    console.warn(`Failed to create standardized ingredient for ${ingredientName}:`, error);
  }
};
