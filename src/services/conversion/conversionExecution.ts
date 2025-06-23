
import { supabase } from "@/integrations/supabase/client";
import { ConversionRequest } from "@/types/commissary";
import { toast } from "sonner";
import { normalizeUnit } from "./conversionValidation";

export const createOutputItem = async (conversionRequest: ConversionRequest) => {
  const normalizedUnit = normalizeUnit(conversionRequest.output_item.uom);
  
  const { data: newItem, error: createError } = await supabase
    .from('commissary_inventory')
    .insert({
      name: conversionRequest.output_item.name,
      category: conversionRequest.output_item.category,
      item_type: 'orderable_item',
      current_stock: conversionRequest.output_item.quantity,
      minimum_threshold: 0,
      unit: normalizedUnit,
      unit_cost: conversionRequest.output_item.unit_cost || 0,
      sku: conversionRequest.output_item.sku,
      storage_location: conversionRequest.output_item.storage_location,
      is_active: true
    })
    .select()
    .single();

  if (createError) {
    console.error('Create error details:', createError);
    toast.error(`Error creating output item: ${createError.message}`);
    return null;
  }

  return newItem;
};

export const createConversionRecord = async (newItem: any, conversionRequest: ConversionRequest, currentUserId: string) => {
  const { data: conversion, error: conversionError } = await supabase
    .from('inventory_conversions')
    .insert({
      store_id: null, // Commissary conversions don't have a specific store
      commissary_item_id: newItem.id,
      inventory_stock_id: null,
      conversion_recipe_id: null,
      finished_goods_quantity: conversionRequest.output_item.quantity,
      converted_by: currentUserId,
      notes: conversionRequest.description || `Conversion: ${conversionRequest.name}`
    })
    .select()
    .single();

  if (conversionError) {
    toast.error(`Error creating conversion record: ${conversionError.message}`);
    return null;
  }

  return conversion;
};

export const updateInputItemsStock = async (conversionRequest: ConversionRequest, conversionId: string) => {
  for (const inputItem of conversionRequest.input_items) {
    // Get current stock first
    const { data: currentItem, error: fetchError } = await supabase
      .from('commissary_inventory')
      .select('current_stock')
      .eq('id', inputItem.commissary_item_id)
      .single();

    if (fetchError) {
      toast.error(`Error fetching current stock: ${fetchError.message}`);
      return false;
    }

    const newStock = currentItem.current_stock - inputItem.quantity;

    // Update stock with calculated value
    const { error: updateError } = await supabase
      .from('commissary_inventory')
      .update({
        current_stock: newStock
      })
      .eq('id', inputItem.commissary_item_id);

    if (updateError) {
      toast.error(`Error updating stock: ${updateError.message}`);
      return false;
    }

    // Create conversion ingredient record
    const { error: ingredientError } = await supabase
      .from('conversion_ingredients')
      .insert({
        inventory_conversion_id: conversionId,
        commissary_item_id: inputItem.commissary_item_id,
        quantity_used: inputItem.quantity
      });

    if (ingredientError) {
      console.warn('Error creating conversion ingredient record:', ingredientError);
    }
  }

  return true;
};
