
import { supabase } from "@/integrations/supabase/client";
import type { InventoryConversion } from "@/types/inventoryManagement";
import { CommissaryInventoryItem, InventoryStock } from "@/types/inventoryManagement";
import { fetchInventoryStock } from "@/services/inventoryManagement/recipeService";
import { toast } from "sonner";

export const fetchInventoryConversions = async (storeId?: string): Promise<InventoryConversion[]> => {
  try {
    // Since we don't have an inventory_conversions table, return empty array for now
    console.warn('Inventory conversions table not implemented yet');
    return [];
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
    // Since we don't have an inventory_conversions table, simulate the operation
    console.warn('Inventory conversions table not implemented yet');
    toast.success('Inventory conversion simulated successfully');
    return null;
  } catch (error) {
    console.error('Error creating inventory conversion:', error);
    toast.error('Failed to create inventory conversion');
    return null;
  }
};

export const fetchCommissaryItemsForConversion = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('is_active', true)
      .gt('current_stock', 0)
      .order('name');

    if (error) throw error;

    // Transform the data to match CommissaryInventoryItem interface
    const transformedData: CommissaryInventoryItem[] = (data || []).map(item => ({
      ...item,
      category: item.category === 'ingredients' ? 'raw_materials' : 
                item.category === 'packaging' ? 'packaging_materials' : 
                'supplies' as const
    }));

    return transformedData;
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
