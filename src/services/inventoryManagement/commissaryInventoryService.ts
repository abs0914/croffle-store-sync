import { supabase } from "@/integrations/supabase/client";
import { CommissaryInventoryItem, CommissaryInventoryFilters } from "@/types/inventoryManagement";
import { toast } from "sonner";

export const fetchCommissaryInventory = async (filters?: CommissaryInventoryFilters): Promise<CommissaryInventoryItem[]> => {
  try {
    let query = supabase
      .from('commissary_inventory')
      .select(`
        *,
        supplier:suppliers(*)
      `)
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

    // Apply stock level filter
    if (filters?.stockLevel && filters.stockLevel !== 'all') {
      switch (filters.stockLevel) {
        case 'out':
          query = query.eq('current_stock', 0);
          break;
        case 'low':
          query = query.filter('current_stock', 'lte', 'minimum_threshold');
          break;
        case 'good':
          query = query.filter('current_stock', 'gt', 'minimum_threshold');
          break;
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching commissary inventory:', error);
    toast.error('Failed to fetch commissary inventory');
    return [];
  }
};

export const createCommissaryInventoryItem = async (
  item: Omit<CommissaryInventoryItem, 'id' | 'created_at' | 'updated_at' | 'supplier'>
): Promise<CommissaryInventoryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .insert({
        name: item.name,
        category: item.category,
        current_stock: item.current_stock,
        minimum_threshold: item.minimum_threshold,
        unit: item.unit,
        unit_cost: item.unit_cost,
        supplier_id: item.supplier_id,
        sku: item.sku,
        barcode: item.barcode,
        expiry_date: item.expiry_date,
        storage_location: item.storage_location,
        is_active: true
      })
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .single();

    if (error) throw error;

    toast.success('Commissary inventory item created successfully');
    return data;
  } catch (error) {
    console.error('Error creating commissary inventory item:', error);
    toast.error('Failed to create commissary inventory item');
    return null;
  }
};

export const updateCommissaryInventoryItem = async (
  id: string,
  updates: Partial<CommissaryInventoryItem>
): Promise<CommissaryInventoryItem | null> => {
  try {
    // Remove properties that don't exist in the database schema
    const dbUpdates: any = { ...updates };
    delete dbUpdates.supplier;

    const { data, error } = await supabase
      .from('commissary_inventory')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .single();

    if (error) throw error;

    toast.success('Commissary inventory item updated successfully');
    return data;
  } catch (error) {
    console.error('Error updating commissary inventory item:', error);
    toast.error('Failed to update commissary inventory item');
    return null;
  }
};

export const deleteCommissaryInventoryItem = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('commissary_inventory')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    toast.success('Commissary inventory item deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting commissary inventory item:', error);
    toast.error('Failed to delete commissary inventory item');
    return false;
  }
};

export const adjustCommissaryInventoryStock = async (
  id: string,
  newStock: number,
  reason: string,
  userId: string
): Promise<boolean> => {
  try {
    // Get current stock
    const { data: currentItem, error: fetchError } = await supabase
      .from('commissary_inventory')
      .select('current_stock')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const previousStock = currentItem.current_stock;

    // Update stock
    const { error: updateError } = await supabase
      .from('commissary_inventory')
      .update({
        current_stock: newStock
      })
      .eq('id', id);

    if (updateError) throw updateError;

    toast.success('Commissary inventory stock adjusted successfully');
    return true;
  } catch (error) {
    console.error('Error adjusting commissary inventory stock:', error);
    toast.error('Failed to adjust commissary inventory stock');
    return false;
  }
};

// Get stock level status
export const getCommissaryStockLevel = (item: CommissaryInventoryItem): 'good' | 'low' | 'out' => {
  if (item.current_stock === 0) return 'out';
  if (item.current_stock <= item.minimum_threshold) return 'low';
  return 'good';
};

// Get stock level color for UI
export const getCommissaryStockLevelColor = (level: 'good' | 'low' | 'out'): string => {
  switch (level) {
    case 'good': return 'text-green-600';
    case 'low': return 'text-yellow-600';
    case 'out': return 'text-red-600';
    default: return 'text-gray-600';
  }
};
