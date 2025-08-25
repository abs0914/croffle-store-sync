import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StandardizedIngredient {
  id: string;
  ingredient_name: string;
  standardized_name: string;
  standardized_unit: 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs';
  category: string;
  created_at: string;
}

export const fetchStandardizedIngredients = async (): Promise<StandardizedIngredient[]> => {
  try {
    const { data, error } = await supabase
      .from('standardized_ingredients')
      .select('*')
      .order('standardized_name');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching standardized ingredients:', error);
    toast.error('Failed to fetch standardized ingredients');
    return [];
  }
};

export const createStandardizedIngredient = async (
  ingredient: {
    ingredient_name: string;
    standardized_name: string;
    standardized_unit: 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs';
    category: string;
  }
): Promise<StandardizedIngredient | null> => {
  try {
    const { data, error } = await supabase
      .from('standardized_ingredients')
      .insert(ingredient)
      .select()
      .single();

    if (error) throw error;

    toast.success('Standardized ingredient created successfully');
    return data;
  } catch (error) {
    console.error('Error creating standardized ingredient:', error);
    toast.error('Failed to create standardized ingredient');
    return null;
  }
};

export const updateStandardizedIngredient = async (
  id: string,
  updates: {
    ingredient_name?: string;
    standardized_name?: string;
    standardized_unit?: 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs';
    category?: string;
  }
): Promise<StandardizedIngredient | null> => {
  try {
    const { data, error } = await supabase
      .from('standardized_ingredients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    toast.success('Standardized ingredient updated successfully');
    return data;
  } catch (error) {
    console.error('Error updating standardized ingredient:', error);
    toast.error('Failed to update standardized ingredient');
    return null;
  }
};

export const deleteStandardizedIngredient = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('standardized_ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('Standardized ingredient deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting standardized ingredient:', error);
    toast.error('Failed to delete standardized ingredient');
    return false;
  }
};

export const regenerateStoreInventory = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('generate_store_inventory_from_recipes');

    if (error) throw error;

    const result = data?.[0];
    if (result) {
      toast.success(
        `Successfully regenerated inventory for ${result.stores_processed} stores. Created ${result.items_created} items.`
      );
    }

    return true;
  } catch (error) {
    console.error('Error regenerating store inventory:', error);
    toast.error('Failed to regenerate store inventory');
    return false;
  }
};