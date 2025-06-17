
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DirectConversionData {
  commissary_item_id: string;
  store_id: string;
  quantity_to_convert: number;
  store_item_name: string;
  store_item_unit: string;
  conversion_ratio: number;
  notes?: string;
}

export interface RecipeProductionData {
  recipe_template_id: string;
  store_id: string;
  quantity_to_produce: number;
  notes?: string;
}

export interface ConversionResult {
  success: boolean;
  conversion_id?: string;
  finished_goods_quantity?: number;
  error?: string;
}

export const processDirectConversion = async (
  conversionData: DirectConversionData,
  userId: string
): Promise<ConversionResult> => {
  try {
    // Get commissary item details
    const { data: commissaryItem, error: commissaryError } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('id', conversionData.commissary_item_id)
      .single();

    if (commissaryError || !commissaryItem) {
      return { success: false, error: 'Commissary item not found' };
    }

    if (commissaryItem.current_stock < conversionData.quantity_to_convert) {
      return { success: false, error: 'Insufficient commissary stock' };
    }

    // Update commissary stock
    const newCommissaryStock = commissaryItem.current_stock - conversionData.quantity_to_convert;
    const { error: stockUpdateError } = await supabase
      .from('commissary_inventory')
      .update({ current_stock: newCommissaryStock })
      .eq('id', conversionData.commissary_item_id);

    if (stockUpdateError) {
      return { success: false, error: 'Failed to update commissary stock' };
    }

    // Calculate converted quantity
    const convertedQuantity = conversionData.quantity_to_convert * conversionData.conversion_ratio;

    // Find or create store inventory item
    let { data: storeItem } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', conversionData.store_id)
      .eq('item', conversionData.store_item_name)
      .eq('unit', conversionData.store_item_unit)
      .single();

    if (storeItem) {
      // Update existing item
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ 
          stock_quantity: storeItem.stock_quantity + convertedQuantity 
        })
        .eq('id', storeItem.id);

      if (updateError) {
        return { success: false, error: 'Failed to update store inventory' };
      }
    } else {
      // Create new item
      const { data: newItem, error: createError } = await supabase
        .from('inventory_stock')
        .insert({
          store_id: conversionData.store_id,
          item: conversionData.store_item_name,
          unit: conversionData.store_item_unit,
          stock_quantity: convertedQuantity,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        return { success: false, error: 'Failed to create store inventory item' };
      }
      storeItem = newItem;
    }

    // Log the conversion
    const { data: conversion, error: conversionError } = await supabase
      .from('inventory_conversions')
      .insert({
        store_id: conversionData.store_id,
        commissary_item_id: conversionData.commissary_item_id,
        inventory_stock_id: storeItem.id,
        finished_goods_quantity: convertedQuantity,
        converted_by: userId,
        notes: conversionData.notes || `Direct conversion: ${conversionData.quantity_to_convert} ${commissaryItem.unit} → ${convertedQuantity} ${conversionData.store_item_unit}`
      })
      .select()
      .single();

    if (conversionError) {
      console.warn('Failed to log conversion:', conversionError);
    }

    toast.success('Direct conversion completed successfully');
    return { 
      success: true, 
      conversion_id: conversion?.id,
      finished_goods_quantity: convertedQuantity 
    };

  } catch (error) {
    console.error('Error in processDirectConversion:', error);
    return { success: false, error: 'System error occurred' };
  }
};

export const processRecipeProduction = async (
  productionData: RecipeProductionData,
  userId: string
): Promise<ConversionResult> => {
  try {
    // Get recipe template with ingredients
    const { data: recipeTemplate, error: recipeError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        recipe_template_ingredients(
          *,
          commissary_inventory:commissary_item_id(*)
        )
      `)
      .eq('id', productionData.recipe_template_id)
      .single();

    if (recipeError || !recipeTemplate) {
      return { success: false, error: 'Recipe template not found' };
    }

    if (!recipeTemplate.recipe_template_ingredients || recipeTemplate.recipe_template_ingredients.length === 0) {
      return { success: false, error: 'Recipe has no ingredients defined' };
    }

    // Check stock availability for all ingredients
    const insufficientItems: string[] = [];
    for (const ingredient of recipeTemplate.recipe_template_ingredients) {
      const requiredQuantity = ingredient.quantity * productionData.quantity_to_produce;
      const availableStock = ingredient.commissary_inventory?.current_stock || 0;
      
      if (availableStock < requiredQuantity) {
        insufficientItems.push(ingredient.commissary_item_name);
      }
    }

    if (insufficientItems.length > 0) {
      return { 
        success: false, 
        error: `Insufficient stock for: ${insufficientItems.join(', ')}` 
      };
    }

    // Deduct ingredients from commissary
    for (const ingredient of recipeTemplate.recipe_template_ingredients) {
      const requiredQuantity = ingredient.quantity * productionData.quantity_to_produce;
      const currentStock = ingredient.commissary_inventory.current_stock;
      const newStock = currentStock - requiredQuantity;

      const { error: deductError } = await supabase
        .from('commissary_inventory')
        .update({ current_stock: newStock })
        .eq('id', ingredient.commissary_item_id);

      if (deductError) {
        return { success: false, error: `Failed to deduct ${ingredient.commissary_item_name}` };
      }
    }

    // Calculate finished goods quantity
    const finishedGoodsQuantity = recipeTemplate.yield_quantity * productionData.quantity_to_produce;
    const finishedItemName = `${recipeTemplate.name} (Produced)`;

    // Find or create store inventory item for finished goods
    let { data: storeItem } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', productionData.store_id)
      .eq('item', finishedItemName)
      .single();

    if (storeItem) {
      // Update existing item
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ 
          stock_quantity: storeItem.stock_quantity + finishedGoodsQuantity 
        })
        .eq('id', storeItem.id);

      if (updateError) {
        return { success: false, error: 'Failed to update store inventory' };
      }
    } else {
      // Create new item
      const { data: newItem, error: createError } = await supabase
        .from('inventory_stock')
        .insert({
          store_id: productionData.store_id,
          item: finishedItemName,
          unit: 'pieces',
          stock_quantity: finishedGoodsQuantity,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        return { success: false, error: 'Failed to create store inventory item' };
      }
      storeItem = newItem;
    }

    // Log the production
    const { data: conversion, error: conversionError } = await supabase
      .from('inventory_conversions')
      .insert({
        store_id: productionData.store_id,
        inventory_stock_id: storeItem.id,
        finished_goods_quantity: finishedGoodsQuantity,
        converted_by: userId,
        notes: productionData.notes || `Recipe production: ${recipeTemplate.name} x${productionData.quantity_to_produce}`
      })
      .select()
      .single();

    if (conversionError) {
      console.warn('Failed to log production:', conversionError);
    }

    toast.success(`Recipe production completed: ${finishedGoodsQuantity} units of ${finishedItemName}`);
    return { 
      success: true, 
      conversion_id: conversion?.id,
      finished_goods_quantity: finishedGoodsQuantity 
    };

  } catch (error) {
    console.error('Error in processRecipeProduction:', error);
    return { success: false, error: 'System error occurred' };
  }
};

export const getConversionHistory = async (storeId?: string) => {
  try {
    let query = supabase
      .from('inventory_conversions')
      .select(`
        *,
        inventory_stock:inventory_stock(item, unit),
        commissary_inventory:commissary_item_id(name, unit),
        stores:store_id(name),
        app_users:converted_by(first_name, last_name),
        conversion_ingredients(
          *,
          commissary_inventory:commissary_item_id(name, unit)
        )
      `)
      .order('conversion_date', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching conversion history:', error);
    return [];
  }
};

export const checkCommissaryStockForRecipe = async (
  recipeTemplateId: string,
  quantityToProduce: number
): Promise<{
  canProduce: boolean;
  maxQuantity: number;
  missingIngredients: string[];
}> => {
  try {
    const { data: recipeTemplate, error } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        recipe_template_ingredients(
          *,
          commissary_inventory:commissary_item_id(*)
        )
      `)
      .eq('id', recipeTemplateId)
      .single();

    if (error || !recipeTemplate) {
      return { canProduce: false, maxQuantity: 0, missingIngredients: ['Recipe not found'] };
    }

    if (!recipeTemplate.recipe_template_ingredients || recipeTemplate.recipe_template_ingredients.length === 0) {
      return { canProduce: false, maxQuantity: 0, missingIngredients: ['No ingredients defined'] };
    }

    let maxQuantity = Infinity;
    const missingIngredients: string[] = [];

    for (const ingredient of recipeTemplate.recipe_template_ingredients) {
      const currentStock = ingredient.commissary_inventory?.current_stock || 0;
      const requiredPerUnit = ingredient.quantity;

      if (currentStock <= 0) {
        missingIngredients.push(ingredient.commissary_item_name);
        maxQuantity = 0;
      } else {
        const possibleQuantity = Math.floor(currentStock / requiredPerUnit);
        maxQuantity = Math.min(maxQuantity, possibleQuantity);
      }
    }

    const canProduce = maxQuantity >= quantityToProduce && missingIngredients.length === 0;
    
    return {
      canProduce,
      maxQuantity: maxQuantity === Infinity ? 0 : maxQuantity,
      missingIngredients
    };

  } catch (error) {
    console.error('Error checking commissary stock for recipe:', error);
    return { canProduce: false, maxQuantity: 0, missingIngredients: ['System error'] };
  }
};
