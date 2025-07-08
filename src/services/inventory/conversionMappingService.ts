
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConversionMapping, ConversionMappingInput } from "@/types/conversionMapping";

export const fetchConversionMappings = async (storeId?: string): Promise<ConversionMapping[]> => {
  try {
    let query = supabase
      .from('inventory_conversion_mappings')
      .select(`
        *,
        inventory_stock:inventory_stock(
          id,
          item,
          unit,
          stock_quantity,
          fractional_stock,
          store_id
        )
      `)
      .eq('is_active', true)
      .order('recipe_ingredient_name');

    if (storeId) {
      // Filter by store through the inventory_stock relationship
      query = query.eq('inventory_stock.store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching conversion mappings:', error);
    toast.error('Failed to fetch conversion mappings');
    return [];
  }
};

export const createConversionMapping = async (
  mappingData: ConversionMappingInput
): Promise<ConversionMapping | null> => {
  try {
    const { data, error } = await supabase
      .from('inventory_conversion_mappings')
      .insert({
        inventory_stock_id: mappingData.inventory_stock_id,
        recipe_ingredient_name: mappingData.recipe_ingredient_name,
        recipe_ingredient_unit: mappingData.recipe_ingredient_unit,
        conversion_factor: mappingData.conversion_factor,
        notes: mappingData.notes,
        is_active: true
      })
      .select(`
        *,
        inventory_stock:inventory_stock(
          id,
          item,
          unit,
          stock_quantity,
          fractional_stock,
          store_id
        )
      `)
      .single();

    if (error) throw error;

    toast.success('Conversion mapping created successfully');
    return data;
  } catch (error: any) {
    console.error('Error creating conversion mapping:', error);
    if (error.code === '23505') {
      toast.error('A conversion mapping already exists for this combination');
    } else {
      toast.error('Failed to create conversion mapping');
    }
    return null;
  }
};

export const updateConversionMapping = async (
  id: string,
  updates: Partial<ConversionMappingInput>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('inventory_conversion_mappings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    toast.success('Conversion mapping updated successfully');
    return true;
  } catch (error: any) {
    console.error('Error updating conversion mapping:', error);
    if (error.code === '23505') {
      toast.error('A conversion mapping already exists for this combination');
    } else {
      toast.error('Failed to update conversion mapping');
    }
    return false;
  }
};

export const deleteConversionMapping = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('inventory_conversion_mappings')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    toast.success('Conversion mapping deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting conversion mapping:', error);
    toast.error('Failed to delete conversion mapping');
    return false;
  }
};

export const findConversionMapping = async (
  storeId: string,
  ingredientName: string,
  ingredientUnit: string
): Promise<ConversionMapping | null> => {
  try {
    const { data, error } = await supabase
      .from('inventory_conversion_mappings')
      .select(`
        *,
        inventory_stock:inventory_stock(
          id,
          item,
          unit,
          stock_quantity,
          fractional_stock,
          store_id
        )
      `)
      .eq('recipe_ingredient_name', ingredientName)
      .eq('recipe_ingredient_unit', ingredientUnit)
      .eq('is_active', true)
      .eq('inventory_stock.store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error finding conversion mapping:', error);
    return null;
  }
};

export const bulkCreateConversionMappings = async (
  mappings: ConversionMappingInput[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('inventory_conversion_mappings')
      .insert(mappings.map(mapping => ({
        ...mapping,
        is_active: true
      })));

    if (error) throw error;

    toast.success(`${mappings.length} conversion mappings created successfully`);
    return true;
  } catch (error: any) {
    console.error('Error bulk creating conversion mappings:', error);
    if (error.code === '23505') {
      toast.error('Some conversion mappings already exist');
    } else {
      toast.error('Failed to create conversion mappings');
    }
    return false;
  }
};
