
import { supabase } from "@/integrations/supabase/client";
import { CommissaryInventoryItem, RawIngredientUpload } from "@/types/commissary";
import { toast } from "sonner";

export const fetchCommissaryInventory = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      unit: item.unit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs' | 'serving' | 'portion' | 'scoop' | 'pair'
    }));
  } catch (error) {
    console.error('Error fetching commissary inventory:', error);
    toast.error('Failed to fetch commissary inventory');
    return [];
  }
};

export const createCommissaryItem = async (item: Omit<CommissaryInventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('commissary_inventory')
      .insert(item);

    if (error) throw error;
    toast.success('Commissary item created successfully');
    return true;
  } catch (error) {
    console.error('Error creating commissary item:', error);
    toast.error('Failed to create commissary item');
    return false;
  }
};

export const bulkUploadRawIngredients = async (ingredients: RawIngredientUpload[]): Promise<boolean> => {
  try {
    // First, get existing suppliers to match names
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name');

    const supplierMap = new Map(suppliers?.map(s => [s.name.toLowerCase(), s.id]) || []);

    const processedIngredients = ingredients.map(ingredient => ({
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      unit_cost: ingredient.unit_cost || 0,
      current_stock: ingredient.current_stock || 0,
      minimum_threshold: ingredient.minimum_threshold || 0,
      supplier_id: ingredient.supplier_name ? supplierMap.get(ingredient.supplier_name.toLowerCase()) : null,
      sku: ingredient.sku,
      storage_location: ingredient.storage_location,
      is_active: true
    }));

    const { error } = await supabase
      .from('commissary_inventory')
      .insert(processedIngredients);

    if (error) throw error;
    
    toast.success(`Successfully uploaded ${ingredients.length} raw ingredients`);
    return true;
  } catch (error) {
    console.error('Error bulk uploading ingredients:', error);
    toast.error('Failed to upload raw ingredients');
    return false;
  }
};
