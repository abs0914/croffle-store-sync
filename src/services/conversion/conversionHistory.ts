
import { supabase } from "@/integrations/supabase/client";
import { CommissaryInventoryItem } from "@/types/commissary";
import { toast } from "sonner";

export const fetchConversionHistory = async (): Promise<any[]> => {
  try {
    console.log('Fetching conversion history...');
    
    // First, try to get basic conversion data without nested relationships
    const { data, error } = await supabase
      .from('inventory_conversions')
      .select('*')
      .order('conversion_date', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase error fetching conversion history:', error);
      throw error;
    }

    console.log('Conversion history fetched successfully:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching conversion history:', error);
    toast.error('Failed to fetch conversion history');
    return [];
  }
};

export const fetchAvailableRawMaterials = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    console.log('Fetching available raw materials...');
    
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('item_type', 'raw_material')
      .eq('is_active', true)
      .gt('current_stock', 0)
      .order('name');

    if (error) {
      console.error('Supabase error fetching raw materials:', error);
      throw error;
    }
    
    console.log('Raw materials fetched successfully:', data);
    
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
