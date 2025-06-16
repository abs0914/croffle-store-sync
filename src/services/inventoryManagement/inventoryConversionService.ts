import { supabase } from "@/integrations/supabase/client";
import type { 
  InventoryConversion, 
  ConversionRecipe, 
  ConversionRecipeForm,
  MultiIngredientConversionForm 
} from "@/types/inventoryManagement";
import { CommissaryInventoryItem, InventoryStock } from "@/types/inventoryManagement";
import { fetchInventoryStock } from "@/services/inventoryManagement/recipeService";
import { toast } from "sonner";

// Helper function to transform database category to our interface category
const transformCategory = (dbCategory: 'ingredients' | 'packaging' | 'supplies'): 'raw_materials' | 'packaging_materials' | 'supplies' => {
  switch (dbCategory) {
    case 'ingredients':
      return 'raw_materials';
    case 'packaging':
      return 'packaging_materials';
    case 'supplies':
      return 'supplies';
    default:
      return 'supplies';
  }
};

export const fetchInventoryConversions = async (storeId?: string): Promise<InventoryConversion[]> => {
  try {
    let query = supabase
      .from('inventory_conversions')
      .select(`
        *,
        conversion_recipe:conversion_recipes(*),
        inventory_stock:inventory_stock(*),
        ingredients:conversion_ingredients(
          *,
          commissary_item:commissary_inventory(*)
        )
      `)
      .order('conversion_date', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transform the data to match our TypeScript interfaces
    const transformedData: InventoryConversion[] = (data || []).map(conversion => ({
      ...conversion,
      ingredients: conversion.ingredients?.map((ingredient: any) => ({
        ...ingredient,
        commissary_item: ingredient.commissary_item ? {
          ...ingredient.commissary_item,
          category: transformCategory(ingredient.commissary_item.category)
        } : undefined
      })) || []
    }));

    return transformedData;
  } catch (error) {
    console.error('Error fetching inventory conversions:', error);
    toast.error('Failed to fetch inventory conversions');
    return [];
  }
};

export const createMultiIngredientConversion = async (
  conversion: MultiIngredientConversionForm,
  storeId: string,
  userId: string
): Promise<InventoryConversion | null> => {
  try {
    // Start a transaction by creating the main conversion
    const { data: newConversion, error: conversionError } = await supabase
      .from('inventory_conversions')
      .insert({
        conversion_recipe_id: conversion.conversion_recipe_id || null,
        store_id: storeId,
        inventory_stock_id: conversion.inventory_stock_id,
        finished_goods_quantity: conversion.finished_goods_quantity,
        converted_by: userId,
        notes: conversion.notes
      })
      .select()
      .single();

    if (conversionError) throw conversionError;

    // Create conversion ingredients
    const ingredientsData = conversion.ingredients.map(ingredient => ({
      inventory_conversion_id: newConversion.id,
      commissary_item_id: ingredient.commissary_item_id,
      quantity_used: ingredient.quantity,
      unit_cost: ingredient.unit_cost
    }));

    const { error: ingredientsError } = await supabase
      .from('conversion_ingredients')
      .insert(ingredientsData);

    if (ingredientsError) throw ingredientsError;

    // Update commissary stock levels directly
    for (const ingredient of conversion.ingredients) {
      // Get current stock
      const { data: currentItem, error: fetchError } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', ingredient.commissary_item_id)
        .single();

      if (fetchError) {
        console.error('Error fetching current stock:', fetchError);
        continue;
      }

      const newStock = currentItem.current_stock - ingredient.quantity;

      // Update stock
      const { error: stockError } = await supabase
        .from('inventory_items')
        .update({ 
          current_stock: newStock,
          last_updated: new Date().toISOString()
        })
        .eq('id', ingredient.commissary_item_id);

      if (stockError) {
        console.error('Error updating commissary stock:', stockError);
        // Continue with other ingredients even if one fails
      }
    }

    // Update target inventory stock directly
    const { data: currentStock, error: fetchStockError } = await supabase
      .from('inventory_stock')
      .select('stock_quantity')
      .eq('id', conversion.inventory_stock_id)
      .single();

    if (fetchStockError) {
      console.error('Error fetching current inventory stock:', fetchStockError);
    } else {
      const newStockQuantity = currentStock.stock_quantity + conversion.finished_goods_quantity;

      const { error: targetStockError } = await supabase
        .from('inventory_stock')
        .update({ 
          stock_quantity: newStockQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversion.inventory_stock_id);

      if (targetStockError) {
        console.error('Error updating target stock:', targetStockError);
      }
    }

    toast.success('Multi-ingredient conversion completed successfully');
    return newConversion;
  } catch (error) {
    console.error('Error creating multi-ingredient conversion:', error);
    toast.error('Failed to create multi-ingredient conversion');
    return null;
  }
};

export const fetchConversionRecipes = async (): Promise<ConversionRecipe[]> => {
  try {
    const { data, error } = await supabase
      .from('conversion_recipes')
      .select(`
        *,
        ingredients:conversion_recipe_ingredients(
          *,
          commissary_item:commissary_inventory(*)
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Transform the data to match our TypeScript interfaces
    const transformedData: ConversionRecipe[] = (data || []).map(recipe => ({
      ...recipe,
      ingredients: recipe.ingredients?.map((ingredient: any) => ({
        ...ingredient,
        commissary_item: ingredient.commissary_item ? {
          ...ingredient.commissary_item,
          category: transformCategory(ingredient.commissary_item.category)
        } : undefined
      })) || []
    }));

    return transformedData;
  } catch (error) {
    console.error('Error fetching conversion recipes:', error);
    toast.error('Failed to fetch conversion recipes');
    return [];
  }
};

export const createConversionRecipe = async (
  recipe: ConversionRecipeForm,
  userId: string
): Promise<ConversionRecipe | null> => {
  try {
    // Create the recipe
    const { data: newRecipe, error: recipeError } = await supabase
      .from('conversion_recipes')
      .insert({
        name: recipe.name,
        description: recipe.description,
        finished_item_name: recipe.finished_item_name,
        finished_item_unit: recipe.finished_item_unit,
        yield_quantity: recipe.yield_quantity,
        instructions: recipe.instructions,
        created_by: userId
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Create recipe ingredients
    const ingredientsData = recipe.ingredients.map(ingredient => ({
      conversion_recipe_id: newRecipe.id,
      commissary_item_id: ingredient.commissary_item_id,
      quantity: ingredient.quantity
    }));

    const { error: ingredientsError } = await supabase
      .from('conversion_recipe_ingredients')
      .insert(ingredientsData);

    if (ingredientsError) throw ingredientsError;

    toast.success('Conversion recipe created successfully');
    return newRecipe;
  } catch (error) {
    console.error('Error creating conversion recipe:', error);
    toast.error('Failed to create conversion recipe');
    return null;
  }
};

export const fetchCommissaryItemsForConversion = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .gt('current_stock', 0)
      .order('name');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching commissary items for conversion:', error);
    toast.error('Failed to fetch commissary items');
    return [];
  }
};

export const fetchStoreInventoryForConversion = async (storeId: string): Promise<InventoryStock[]> => {
  try {
    return await fetchInventoryStock(storeId);
  } catch (error) {
    console.error('Error fetching store inventory for conversion:', error);
    toast.error('Failed to fetch store inventory');
    return [];
  }
};

export const createOrFindStoreInventoryItem = async (
  storeId: string,
  itemName: string,
  unit: string
): Promise<InventoryStock | null> => {
  try {
    // First, try to find existing item
    const { data: existingItem, error: findError } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('item', itemName)
      .eq('is_active', true)
      .single();

    if (!findError && existingItem) {
      return existingItem;
    }

    // If not found, create new item
    const { data: newItem, error: createError } = await supabase
      .from('inventory_stock')
      .insert({
        store_id: storeId,
        item: itemName,
        unit: unit,
        stock_quantity: 0,
        is_active: true
      })
      .select('*')
      .single();

    if (createError) throw createError;

    return newItem;
  } catch (error) {
    console.error('Error creating/finding store inventory item:', error);
    toast.error('Failed to create/find store inventory item');
    return null;
  }
};

export const validateConversionIngredients = (
  ingredients: any[],
  availableItems: CommissaryInventoryItem[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (const ingredient of ingredients) {
    const availableItem = availableItems.find(item => item.id === ingredient.commissary_item_id);
    
    if (!availableItem) {
      errors.push('Invalid ingredient selected');
      continue;
    }

    if (ingredient.quantity > availableItem.current_stock) {
      errors.push(`Insufficient stock for ${availableItem.name}. Available: ${availableItem.current_stock} ${availableItem.unit}`);
    }

    if (ingredient.quantity <= 0) {
      errors.push(`Invalid quantity for ${availableItem.name}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const getConversionSuggestions = async (storeId: string): Promise<any[]> => {
  try {
    // This would be a complex query to suggest conversions based on:
    // - Low store inventory levels
    // - Available commissary stock
    // - Historical conversion patterns
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error getting conversion suggestions:', error);
    return [];
  }
};
