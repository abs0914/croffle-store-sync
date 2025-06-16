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

    const { data, error } = await query;

    if (error) throw error;

    // Process the data to handle typing properly
    return (data || []).map(item => ({
      ...item,
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      unit: item.unit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
      supplier: item.supplier !== null && typeof item.supplier === 'object' && item.supplier && 'id' in item.supplier
        ? item.supplier as any 
        : null
    }));
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
    return {
      ...data,
      category: data.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      unit: data.unit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
      supplier: data.supplier !== null && typeof data.supplier === 'object' && data.supplier && 'id' in data.supplier
        ? data.supplier as any 
        : null
    };
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
    const { data, error } = await supabase
      .from('commissary_inventory')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .single();

    if (error) throw error;

    toast.success('Commissary inventory item updated successfully');
    return {
      ...data,
      category: data.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      unit: data.unit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
      supplier: data.supplier !== null && typeof data.supplier === 'object' && data.supplier && 'id' in data.supplier
        ? data.supplier as any 
        : null
    };
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
      .delete()
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
    const { error } = await supabase
      .from('commissary_inventory')
      .update({ current_stock: newStock })
      .eq('id', id);

    if (error) throw error;

    toast.success('Stock adjusted successfully');
    return true;
  } catch (error) {
    console.error('Error adjusting stock:', error);
    toast.error('Failed to adjust stock');
    return false;
  }
};

export const getCommissaryStockLevel = (item: CommissaryInventoryItem): 'good' | 'low' | 'out' => {
  if (item.current_stock === 0) return 'out';
  if (item.current_stock <= item.minimum_threshold) return 'low';
  return 'good';
};

export const getCommissaryStockLevelColor = (level: 'good' | 'low' | 'out'): string => {
  switch (level) {
    case 'good': return 'text-green-600';
    case 'low': return 'text-yellow-600';
    case 'out': return 'text-red-600';
    default: return 'text-gray-600';
  }
};
