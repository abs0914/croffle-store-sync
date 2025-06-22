
import { supabase } from "@/integrations/supabase/client";
import { CommissaryInventoryItem } from "@/types/commissary"; // Use commissary types instead
import { toast } from "sonner";

export const fetchCommissaryInventory = async (filters?: any): Promise<CommissaryInventoryItem[]> => {
  try {
    let query = supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .order('name');

    // Apply filters if provided
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters?.supplier) {
      query = query.eq('supplier_id', filters.supplier);
    }
    if (filters?.item_type && filters.item_type !== 'all') {
      query = query.eq('item_type', filters.item_type);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Cast the data to ensure proper typing, mapping unit to uom
    return (data || []).map(item => ({
      ...item,
      uom: item.unit || 'units', // Map unit to uom with fallback
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      item_type: item.item_type as 'raw_material' | 'supply' | 'orderable_item'
    }));
  } catch (error) {
    console.error('Error fetching commissary inventory:', error);
    toast.error('Failed to fetch commissary inventory');
    return [];
  }
};

export const createCommissaryInventoryItem = async (item: Omit<CommissaryInventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
  try {
    // Map uom to unit for database compatibility during transition
    const dbItem = {
      ...item,
      unit: item.uom // Store UOM as unit in database for now
    };
    
    const { error } = await supabase
      .from('commissary_inventory')
      .insert(dbItem);

    if (error) throw error;
    toast.success('Commissary item created successfully');
    return true;
  } catch (error) {
    console.error('Error creating commissary item:', error);
    toast.error('Failed to create commissary item');
    return false;
  }
};

export const updateCommissaryInventoryItem = async (
  id: string, 
  updates: Partial<Omit<CommissaryInventoryItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
  try {
    // Map uom to unit for database compatibility during transition
    const dbUpdates = {
      ...updates,
      unit: updates.uom // Store UOM as unit in database for now
    };
    
    const { error } = await supabase
      .from('commissary_inventory')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
    toast.success('Commissary item updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating commissary item:', error);
    toast.error('Failed to update commissary item');
    return false;
  }
};

export const deleteCommissaryInventoryItem = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('commissary_inventory')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    toast.success('Commissary item deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting commissary item:', error);
    toast.error('Failed to delete commissary item');
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
      .update({ 
        current_stock: newStock,
        updated_at: new Date().toISOString()
      })
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
  if (item.current_stock <= 0) return 'out';
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

export const removeDuplicateCommissaryItems = (items: CommissaryInventoryItem[]): CommissaryInventoryItem[] => {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.name}-${item.category}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const fetchOrderableItems = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .eq('item_type', 'orderable_item')
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
    console.error('Error fetching orderable items:', error);
    toast.error('Failed to fetch orderable items');
    return [];
  }
};
