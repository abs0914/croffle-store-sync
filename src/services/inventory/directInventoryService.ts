import { supabase } from "@/integrations/supabase/client";

export interface InventoryStockItem {
  id: string;
  store_id: string;
  item: string;
  unit: string;
  stock_quantity: number;
  serving_ready_quantity: number;
  minimum_threshold: number;
  cost: number;
  is_active: boolean;
  is_fractional_supported: boolean;
  sku?: string;
  created_at: string;
  updated_at: string;
}

export const getStoreInventoryStock = async (storeId: string): Promise<InventoryStockItem[]> => {
  const { data, error } = await supabase
    .from('inventory_stock')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('item');

  if (error) {
    console.error('Error fetching inventory stock:', error);
    throw error;
  }

  return data || [];
};

export const updateInventoryStock = async (
  itemId: string,
  updates: Partial<InventoryStockItem>
): Promise<InventoryStockItem> => {
  const { data, error } = await supabase
    .from('inventory_stock')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating inventory stock:', error);
    throw error;
  }

  return data;
};

export const deductInventoryStock = async (
  itemId: string,
  quantity: number,
  fractionalQuantity?: number
): Promise<InventoryStockItem> => {
  const { data: currentItem, error: fetchError } = await supabase
    .from('inventory_stock')
    .select('*')
    .eq('id', itemId)
    .single();

  if (fetchError || !currentItem) {
    throw new Error('Inventory item not found');
  }

  const newStockQuantity = Math.max(0, currentItem.stock_quantity - quantity);
  const newServingQuantity = Math.max(0, currentItem.serving_ready_quantity - (fractionalQuantity || quantity));

  return await updateInventoryStock(itemId, {
    stock_quantity: newStockQuantity,
    serving_ready_quantity: newServingQuantity
  });
};

export const addInventoryStock = async (
  itemId: string,
  quantity: number,
  fractionalQuantity?: number
): Promise<InventoryStockItem> => {
  const { data: currentItem, error: fetchError } = await supabase
    .from('inventory_stock')
    .select('*')
    .eq('id', itemId)
    .single();

  if (fetchError || !currentItem) {
    throw new Error('Inventory item not found');
  }

  const newStockQuantity = currentItem.stock_quantity + quantity;
  const newServingQuantity = currentItem.serving_ready_quantity + (fractionalQuantity || quantity);

  return await updateInventoryStock(itemId, {
    stock_quantity: newStockQuantity,
    serving_ready_quantity: newServingQuantity
  });
};