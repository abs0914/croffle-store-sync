
import { supabase } from "@/integrations/supabase/client";
import { Ingredient } from "@/types";
import { toast } from "sonner";

// Update an ingredient
export const updateIngredient = async (id: string, updates: Partial<Ingredient>): Promise<Ingredient | null> => {
  try {
    // Convert ingredient updates to product updates
    const productUpdates: any = {
      name: updates.name,
      is_active: updates.is_active,
      cost: updates.cost_per_unit
    };
    
    const { data, error } = await supabase
      .from('products')
      .update(productUpdates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Transform back to ingredient format
    const updatedIngredient: Ingredient = {
      id: data.id,
      name: data.name,
      unit: updates.unit || 'pieces',
      unit_type: updates.unit_type || 'pieces',
      store_id: data.store_id,
      stock_quantity: data.stock_quantity || 0,
      cost_per_unit: data.cost || 0,
      is_active: data.is_active || true,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
    
    toast.success("Ingredient updated successfully");
    return updatedIngredient;
  } catch (error) {
    console.error("Error updating ingredient:", error);
    toast.error("Failed to update ingredient");
    return null;
  }
};
