
import { supabase } from "@/integrations/supabase/client";

export interface UploadData {
  commissaryMap: Map<string, any>;
  categoryMap: Map<string, any>;
  storeInventoryMap: Map<string, any>;
  storeId: string; // Add storeId to the interface
}

export const fetchDataForUpload = async (storeId?: string): Promise<UploadData> => {
  // Get commissary inventory for ingredient matching
  const { data: commissaryItems } = await supabase
    .from('commissary_inventory')
    .select('id, name, unit_cost')
    .eq('is_active', true);

  const commissaryMap = new Map(commissaryItems?.map(item => [item.name.toLowerCase(), item]) || []);

  // Get existing categories for the store (only if storeId is provided)
  let categoryMap = new Map();
  if (storeId) {
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('is_active', true);

    categoryMap = new Map(existingCategories?.map(cat => [cat.name.toLowerCase(), cat]) || []);
  }

  // Get store inventory items for the specific store (only if storeId is provided)
  let storeInventoryMap = new Map();
  if (storeId) {
    const { data: storeInventoryItems } = await supabase
      .from('inventory_stock')
      .select('id, item, store_id')
      .eq('store_id', storeId)
      .eq('is_active', true);

    storeInventoryMap = new Map(storeInventoryItems?.map(item => [item.item.toLowerCase(), item]) || []);
  }

  return {
    commissaryMap,
    categoryMap,
    storeInventoryMap,
    storeId: storeId || '' // Include storeId in the returned data
  };
};

export const getUnitMapping = (): Record<string, string> => {
  return {
    'piece': 'pieces',
    'serving': 'g',
    'portion': 'g',
    'scoop': 'g',
    'pair': 'pieces',
    'gram': 'g',
    'grams': 'g',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'liter': 'liters',
    'litre': 'liters',
    'milliliter': 'ml',
    'millilitre': 'ml',
    'box': 'boxes',
    'pack': 'packs',
    'package': 'packs'
  };
};

export const getValidUnits = (): string[] => {
  return ['kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs'];
};
