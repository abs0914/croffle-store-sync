
import { supabase } from "@/integrations/supabase/client";
import { 
  CommissaryInventoryItem, 
  InventoryStock,
  MultiIngredientConversionForm,
  ConversionRecipe,
  ConversionRecipeForm,
  ConversionRecipeIngredientForm 
} from "@/types/inventoryManagement";
import type { InventoryConversion } from "@/types/inventoryManagement";
import { toast } from "sonner";

export const fetchCommissaryItemsForConversion = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .gt('current_stock', 0)
      .order('name');

    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      unit: item.unit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
      supplier: null
    }));
  } catch (error) {
    console.error('Error fetching commissary items:', error);
    toast.error('Failed to fetch commissary items');
    return [];
  }
};

export const fetchStoreInventoryForConversion = async (storeId: string): Promise<InventoryStock[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('item');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching store inventory:', error);
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
    // First check if item already exists
    const { data: existing, error: findError } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('item', itemName)
      .eq('unit', unit)
      .single();

    if (existing) {
      return existing;
    }

    // Create new item if it doesn't exist
    const { data, error } = await supabase
      .from('inventory_stock')
      .insert({
        store_id: storeId,
        item: itemName,
        unit: unit,
        stock_quantity: 0,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating/finding store inventory item:', error);
    toast.error('Failed to create inventory item');
    return null;
  }
};

export const createMultiIngredientConversion = async (
  conversionData: MultiIngredientConversionForm,
  storeId: string,
  userId: string
): Promise<InventoryConversion | null> => {
  try {
    // Start a transaction-like process
    const { data: conversion, error: conversionError } = await supabase
      .from('inventory_conversions')
      .insert({
        store_id: storeId,
        inventory_stock_id: conversionData.inventory_stock_id,
        finished_goods_quantity: conversionData.finished_goods_quantity,
        conversion_recipe_id: conversionData.conversion_recipe_id,
        converted_by: userId,
        notes: conversionData.notes
      })
      .select(`
        *,
        inventory_stock:inventory_stock(*),
        conversion_recipe:conversion_recipes(*)
      `)
      .single();

    if (conversionError) throw conversionError;

    // Process ingredients
    const ingredientPromises = conversionData.ingredients.map(async (ingredient) => {
      // Update commissary stock
      const { error: stockError } = await supabase
        .from('commissary_inventory')
        .update({
          current_stock: supabase.raw(`current_stock - ${ingredient.quantity}`)
        })
        .eq('id', ingredient.commissary_item_id);

      if (stockError) throw stockError;

      // Create conversion ingredient record
      const { error: ingredientError } = await supabase
        .from('conversion_ingredients')
        .insert({
          inventory_conversion_id: conversion.id,
          commissary_item_id: ingredient.commissary_item_id,
          quantity_used: ingredient.quantity,
          unit_cost: ingredient.unit_cost
        });

      if (ingredientError) throw ingredientError;
    });

    await Promise.all(ingredientPromises);

    // Update store inventory
    const { error: storeStockError } = await supabase
      .from('inventory_stock')
      .update({
        stock_quantity: supabase.raw(`stock_quantity + ${conversionData.finished_goods_quantity}`)
      })
      .eq('id', conversionData.inventory_stock_id);

    if (storeStockError) throw storeStockError;

    toast.success('Conversion completed successfully');
    return conversion as InventoryConversion;

  } catch (error) {
    console.error('Error creating conversion:', error);
    toast.error('Failed to complete conversion');
    return null;
  }
};

export const fetchInventoryConversions = async (storeId: string): Promise<InventoryConversion[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_conversions')
      .select(`
        *,
        inventory_stock:inventory_stock(*),
        conversion_recipe:conversion_recipes(*),
        ingredients:conversion_ingredients(
          *,
          commissary_item:commissary_inventory(*)
        )
      `)
      .eq('store_id', storeId)
      .order('conversion_date', { ascending: false });

    if (error) throw error;

    // Handle type conversion with proper error handling
    return (data || []).map(item => ({
      ...item,
      ingredients: (item.ingredients || []).map((ing: any) => ({
        ...ing,
        commissary_item: ing.commissary_item || null
      }))
    })) as InventoryConversion[];
  } catch (error) {
    console.error('Error fetching conversions:', error);
    toast.error('Failed to fetch conversions');
    return [];
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

    // Handle type conversion with proper error handling
    return (data || []).map(item => ({
      ...item,
      ingredients: (item.ingredients || []).map((ing: any) => ({
        ...ing,
        commissary_item: ing.commissary_item || null
      }))
    })) as ConversionRecipe[];
  } catch (error) {
    console.error('Error fetching conversion recipes:', error);
    toast.error('Failed to fetch conversion recipes');
    return [];
  }
};

export const createConversionRecipe = async (
  recipeData: ConversionRecipeForm,
  userId: string
): Promise<ConversionRecipe | null> => {
  try {
    // Create the recipe first
    const { data: recipe, error: recipeError } = await supabase
      .from('conversion_recipes')
      .insert({
        name: recipeData.name,
        description: recipeData.description,
        finished_item_name: recipeData.finished_item_name,
        finished_item_unit: recipeData.finished_item_unit,
        yield_quantity: recipeData.yield_quantity,
        instructions: recipeData.instructions,
        created_by: userId,
        is_active: true
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Create the ingredients
    const ingredientPromises = recipeData.ingredients.map(async (ingredient) => {
      const { error: ingredientError } = await supabase
        .from('conversion_recipe_ingredients')
        .insert({
          conversion_recipe_id: recipe.id,
          commissary_item_id: ingredient.commissary_item_id,
          quantity: ingredient.quantity
        });

      if (ingredientError) throw ingredientError;
    });

    await Promise.all(ingredientPromises);

    toast.success('Conversion recipe created successfully');
    return recipe as ConversionRecipe;
  } catch (error) {
    console.error('Error creating conversion recipe:', error);
    toast.error('Failed to create conversion recipe');
    return null;
  }
};
