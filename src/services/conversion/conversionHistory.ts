
import { supabase } from "@/integrations/supabase/client";
import { CommissaryInventoryItem } from "@/types/commissary";
import { toast } from "sonner";

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
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      item_type: item.item_type as 'raw_material' | 'supply' | 'orderable_item'
    }));
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    toast.error('Failed to fetch raw materials');
    return [];
  }
};
