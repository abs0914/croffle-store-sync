
import { supabase } from "@/integrations/supabase/client";
import { InventoryItem, InventoryFilters } from "@/types/inventoryManagement";
import { toast } from "sonner";

export const fetchInventoryItems = async (storeId: string, filters?: InventoryFilters): Promise<InventoryItem[]> => {
  try {
    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('name');

    // Apply filters
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters?.supplier) {
      query = query.eq('supplier_id', filters.supplier);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    let items = data || [];

    // Apply stock level filter
    if (filters?.stockLevel && filters.stockLevel !== 'all') {
      items = items.filter(item => {
        const stockLevel = getStockLevel(item.current_stock, item.minimum_threshold);
        return stockLevel === filters.stockLevel;
      });
    }

    return items;
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    toast.error('Failed to fetch inventory items');
    return [];
  }
};

export const getStockLevel = (currentStock: number, minimumThreshold: number): 'good' | 'low' | 'out' => {
  if (currentStock === 0) return 'out';
  if (currentStock <= minimumThreshold) return 'low';
  return 'good';
};

export const createInventoryItem = async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'last_updated' | 'supplier'>): Promise<InventoryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        ...item,
        last_updated: new Date().toISOString()
      })
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .single();

    if (error) throw error;

    toast.success('Inventory item created successfully');
    return data;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    toast.error('Failed to create inventory item');
    return null;
  }
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .update({
        ...updates,
        last_updated: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .single();

    if (error) throw error;

    toast.success('Inventory item updated successfully');
    return data;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    toast.error('Failed to update inventory item');
    return null;
  }
};

export const deleteInventoryItem = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    toast.success('Inventory item deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    toast.error('Failed to delete inventory item');
    return false;
  }
};

export const adjustStock = async (
  itemId: string,
  newStock: number,
  reason: string,
  userId: string
): Promise<boolean> => {
  try {
    // First get current stock
    const { data: currentItem, error: fetchError } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', itemId)
      .single();

    if (fetchError) throw fetchError;

    const previousStock = currentItem.current_stock;
    const quantityChange = newStock - previousStock;

    // Update the stock
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({ 
        current_stock: newStock,
        last_updated: new Date().toISOString()
      })
      .eq('id', itemId);

    if (updateError) throw updateError;

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('stock_transactions')
      .insert({
        inventory_item_id: itemId,
        transaction_type: 'adjustment',
        quantity_change: quantityChange,
        previous_stock: previousStock,
        new_stock: newStock,
        reference_type: 'manual',
        notes: reason,
        created_by: userId
      });

    if (transactionError) throw transactionError;

    toast.success('Stock adjusted successfully');
    return true;
  } catch (error) {
    console.error('Error adjusting stock:', error);
    toast.error('Failed to adjust stock');
    return false;
  }
};
