import { supabase } from "@/integrations/supabase/client";
import { InventoryConversion, CommissaryInventoryItem, InventoryStock } from "@/types/inventoryManagement";
import { fetchInventoryStock } from "@/services/inventoryManagement/recipeService";
import { toast } from "sonner";

export const fetchInventoryConversions = async (storeId?: string): Promise<InventoryConversion[]> => {
  try {
    let query = supabase
      .from('inventory_conversions')
      .select(`
        *,
        commissary_item:commissary_inventory(*),
        inventory_stock:inventory_stock(*)
      `)
      .order('conversion_date', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching inventory conversions:', error);
    toast.error('Failed to fetch inventory conversions');
    return [];
  }
};

export const createInventoryConversion = async (
  conversion: Omit<InventoryConversion, 'id' | 'created_at' | 'commissary_item' | 'inventory_stock'>
): Promise<InventoryConversion | null> => {
  try {
    // Start a transaction to ensure data consistency
    const { data, error } = await supabase.rpc('create_inventory_conversion', {
      p_commissary_item_id: conversion.commissary_item_id,
      p_store_id: conversion.store_id,
      p_inventory_stock_id: conversion.inventory_stock_id,
      p_raw_material_quantity: conversion.raw_material_quantity,
      p_finished_goods_quantity: conversion.finished_goods_quantity,
      p_conversion_ratio: conversion.conversion_ratio,
      p_converted_by: conversion.converted_by,
      p_notes: conversion.notes || null
    });

    if (error) {
      // If RPC doesn't exist, fall back to manual transaction
      return await createInventoryConversionManual(conversion);
    }

    toast.success('Inventory conversion completed successfully');
    return data;
  } catch (error) {
    console.error('Error creating inventory conversion:', error);
    toast.error('Failed to create inventory conversion');
    return null;
  }
};

// Manual conversion creation (fallback if RPC doesn't exist)
const createInventoryConversionManual = async (
  conversion: Omit<InventoryConversion, 'id' | 'created_at' | 'commissary_item' | 'inventory_stock'>
): Promise<InventoryConversion | null> => {
  try {
    // 1. Check commissary inventory has enough stock
    const { data: commissaryItem, error: commissaryError } = await supabase
      .from('commissary_inventory')
      .select('current_stock')
      .eq('id', conversion.commissary_item_id)
      .single();

    if (commissaryError) throw commissaryError;

    if (commissaryItem.current_stock < conversion.raw_material_quantity) {
      toast.error('Insufficient commissary inventory stock');
      return null;
    }

    // 2. Create conversion record
    const { data: conversionData, error: conversionError } = await supabase
      .from('inventory_conversions')
      .insert(conversion)
      .select(`
        *,
        commissary_item:commissary_inventory(*),
        inventory_stock:inventory_stock(*)
      `)
      .single();

    if (conversionError) throw conversionError;

    // 3. Update commissary inventory (decrease)
    const { error: commissaryUpdateError } = await supabase
      .from('commissary_inventory')
      .update({ 
        current_stock: commissaryItem.current_stock - conversion.raw_material_quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversion.commissary_item_id);

    if (commissaryUpdateError) throw commissaryUpdateError;

    // 4. Update store inventory (increase)
    const { data: storeItem, error: storeError } = await supabase
      .from('inventory_stock')
      .select('stock_quantity')
      .eq('id', conversion.inventory_stock_id)
      .single();

    if (storeError) throw storeError;

    const { error: storeUpdateError } = await supabase
      .from('inventory_stock')
      .update({ 
        stock_quantity: storeItem.stock_quantity + conversion.finished_goods_quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversion.inventory_stock_id);

    if (storeUpdateError) throw storeUpdateError;

    toast.success('Inventory conversion completed successfully');
    return conversionData;
  } catch (error) {
    console.error('Error in manual inventory conversion:', error);
    toast.error('Failed to complete inventory conversion');
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
    // Use the existing fetchInventoryStock function from recipeService
    return await fetchInventoryStock(storeId);
  } catch (error) {
    console.error('Error fetching store inventory for conversion:', error);
    toast.error('Failed to fetch store inventory');
    return [];
  }
};

// Create or find store inventory item for conversion
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

// Calculate conversion suggestions based on commissary stock and store needs
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
