
import { supabase } from "@/integrations/supabase/client";
import { ConversionRequest, CommissaryInventoryItem } from "@/types/commissary";
import { toast } from "sonner";

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

    // Create the output item as orderable_item
    const { data: newItem, error: createError } = await supabase
      .from('commissary_inventory')
      .insert({
        name: conversionRequest.output_item.name,
        category: conversionRequest.output_item.category,
        item_type: 'orderable_item',
        current_stock: conversionRequest.output_item.quantity,
        minimum_threshold: 0,
        unit: conversionRequest.output_item.uom,
        unit_cost: conversionRequest.output_item.unit_cost || 0,
        sku: conversionRequest.output_item.sku,
        storage_location: conversionRequest.output_item.storage_location,
        is_active: true
      })
      .select()
      .single();

    if (createError) {
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
      // Update stock
      const { error: updateError } = await supabase
        .from('commissary_inventory')
        .update({
          current_stock: supabase.rpc('subtract_stock', {
            current_stock: supabase.raw('current_stock'),
            quantity: inputItem.quantity
          })
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
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies'
    }));
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    toast.error('Failed to fetch raw materials');
    return [];
  }
};
