
import { supabase } from "@/integrations/supabase/client";
import { CommissaryInventoryItem } from "@/types/commissary"; // Use commissary types instead
import { toast } from "sonner";

export const fetchCommissaryInventory = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    
    // Cast the data to ensure proper typing, mapping unit to uom
    return (data || []).map(item => ({
      ...item,
      uom: item.unit || item.uom, // Support both unit and uom columns during transition
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies'
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
