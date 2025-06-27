
import { supabase } from "@/integrations/supabase/client";
import { ConversionRequest } from "@/types/commissary";
import { toast } from "sonner";
import { normalizeUnit } from "./conversionValidation";

// Map business categories to database categories
const CATEGORY_MAPPING = {
  'regular_croissants': 'supplies',
  'flavored_croissants': 'supplies', 
  'sauces': 'supplies',
  'toppings': 'supplies',
  'packaging': 'packaging_materials',
  'miscellaneous': 'supplies'
} as const;

export const createOutputItem = async (conversionRequest: ConversionRequest) => {
  const normalizedUnit = normalizeUnit(conversionRequest.output_item.uom);
  
  // Map business category to database category
  const dbCategory = CATEGORY_MAPPING[conversionRequest.output_item.category as keyof typeof CATEGORY_MAPPING] || 'supplies';
  
  // Calculate total cost from input items if not provided
  let totalCost = conversionRequest.output_item.unit_cost || 0;
  if (totalCost === 0) {
    // Calculate cost based on input materials
    for (const input of conversionRequest.input_items) {
      const { data: item } = await supabase
        .from('commissary_inventory')
        .select('unit_cost')
        .eq('id', input.commissary_item_id)
        .single();
      
      if (item?.unit_cost) {
        totalCost += (item.unit_cost * input.quantity);
      }
    }
    
    // For 1:1 conversions (like croissant repackaging), minimal processing cost
    const isOneToOneConversion = conversionRequest.input_items.length === 1 && 
                                 conversionRequest.input_items[0].quantity === conversionRequest.output_item.quantity;
    
    if (isOneToOneConversion) {
      // Add minimal 2% processing/certification cost for 1:1 conversions
      totalCost = totalCost * 1.02;
    } else {
      // Add 10% processing cost for complex conversions
      totalCost = totalCost * 1.1;
    }
  }
  
  const { data: newItem, error: createError } = await supabase
    .from('commissary_inventory')
    .insert({
      name: conversionRequest.output_item.name,
      category: dbCategory,
      item_type: 'orderable_item', // This is key - marking as orderable
      current_stock: conversionRequest.output_item.quantity,
      minimum_threshold: Math.max(1, Math.floor(conversionRequest.output_item.quantity * 0.1)), // 10% of initial stock
      unit: normalizedUnit,
      unit_cost: totalCost / conversionRequest.output_item.quantity, // Cost per unit
      sku: conversionRequest.output_item.sku || `ORD-${Date.now()}`,
      storage_location: conversionRequest.output_item.storage_location || 'Finished Goods',
      is_active: true
    })
    .select()
    .single();

  if (createError) {
    console.error('Create error details:', createError);
    toast.error(`Error creating output item: ${createError.message}`);
    return null;
  }

  console.log('Created orderable item:', newItem);
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
