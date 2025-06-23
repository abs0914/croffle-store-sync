import { supabase } from "@/integrations/supabase/client";
import { ConversionRequest, CommissaryInventoryItem } from "@/types/commissary";
import { toast } from "sonner";

// Valid units that match the database constraint
const VALID_UNITS = [
  'kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs', 
  '1 Box', '1 Kilo', '1 Liter', '900 grams', '2500 grams', 
  '5000 grams', '1000 grams', '750 grams', '454 grams', 
  '500 grams', '680 grams', '6000 grams', '630 grams', 
  'Piece', 'Pack of 25', 'Pack of 50', 'Pack of 100', 
  'Pack of 20', 'Pack of 32', 'Pack of 24', 'Pack of 27'
];

// Map common unit variations to valid database units
const UNIT_MAPPING: Record<string, string> = {
  'box': '1 Box',
  'boxes': '1 Box', 
  'piece': 'Piece',
  'pieces': 'Piece',
  'kg': '1 Kilo',
  'kilo': '1 Kilo',
  'kilos': '1 Kilo',
  'liter': '1 Liter',
  'liters': '1 Liter',
  'ml': 'ml',
  'g': 'g',
  'grams': 'g',
  'pack': 'Pack of 25',
  'packs': 'Pack of 25'
};

const normalizeUnit = (unit: string): string => {
  const lowerUnit = unit.toLowerCase().trim();
  return UNIT_MAPPING[lowerUnit] || unit;
};

export const executeConversion = async (conversionRequest: ConversionRequest): Promise<boolean> => {
  try {
    console.log('Starting conversion process:', conversionRequest);

    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData.user?.id;

    if (!currentUserId) {
      toast.error('User not authenticated');
      return false;
    }

    // Validate input items have sufficient stock
    for (const inputItem of conversionRequest.input_items) {
      const { data: item, error } = await supabase
        .from('commissary_inventory')
        .select('current_stock, name')
        .eq('id', inputItem.commissary_item_id)
        .single();

      if (error) {
        toast.error(`Error checking stock for item: ${error.message}`);
        return false;
      }

      if (item.current_stock < inputItem.quantity) {
        toast.error(`Insufficient stock for ${item.name}. Available: ${item.current_stock}, Required: ${inputItem.quantity}`);
        return false;
      }
    }

    // Normalize the output item unit
    const normalizedUnit = normalizeUnit(conversionRequest.output_item.uom);
    
    console.log('Original unit:', conversionRequest.output_item.uom);
    console.log('Normalized unit:', normalizedUnit);

    // Validate the normalized unit
    if (!VALID_UNITS.includes(normalizedUnit)) {
      toast.error(`Invalid unit: ${conversionRequest.output_item.uom}. Please use a valid unit from the dropdown.`);
      return false;
    }

    // Create the output item as orderable_item
    const { data: newItem, error: createError } = await supabase
      .from('commissary_inventory')
      .insert({
        name: conversionRequest.output_item.name,
        category: conversionRequest.output_item.category,
        item_type: 'orderable_item',
        current_stock: conversionRequest.output_item.quantity,
        minimum_threshold: 0,
        unit: normalizedUnit, // Use normalized unit
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
      return false;
    }

    // Create conversion record
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
      return false;
    }

    // Update input items stock and create conversion ingredients records
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
          inventory_conversion_id: conversion.id,
          commissary_item_id: inputItem.commissary_item_id,
          quantity_used: inputItem.quantity
        });

      if (ingredientError) {
        console.warn('Error creating conversion ingredient record:', ingredientError);
      }
    }

    toast.success(`Successfully converted materials into ${conversionRequest.output_item.name}`);
    return true;

  } catch (error) {
    console.error('Conversion error:', error);
    toast.error('Failed to execute conversion');
    return false;
  }
};

export const fetchConversionHistory = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_conversions')
      .select(`
        *,
        commissary_item:commissary_inventory(name, unit),
        conversion_ingredients(
          quantity_used,
          commissary_item:commissary_inventory(name, unit)
        )
      `)
      .order('conversion_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching conversion history:', error);
    toast.error('Failed to fetch conversion history');
    return [];
  }
};

export const fetchAvailableRawMaterials = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .in('item_type', ['raw_material', 'supply'])
      .eq('is_active', true)
      .gt('current_stock', 0)
      .order('name');

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      uom: item.unit || 'units',
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      item_type: item.item_type as 'raw_material' | 'supply' | 'orderable_item'
    }));
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    toast.error('Failed to fetch raw materials');
    return [];
  }
};
