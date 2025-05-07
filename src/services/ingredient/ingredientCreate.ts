
import { supabase } from "@/integrations/supabase/client";
import { Ingredient } from "@/types";
import { toast } from "sonner";

// Create a new ingredient
export const createIngredient = async (ingredient: Omit<Ingredient, "id">): Promise<Ingredient | null> => {
  try {
    // We'll create a special product record to serve as an ingredient
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: ingredient.name,
        store_id: ingredient.store_id,
        stock_quantity: ingredient.stock_quantity,
        cost: ingredient.cost_per_unit,
        is_active: ingredient.is_active,
        sku: `ING-${Date.now()}`, // Generate a unique SKU
        price: 0, // Zero price for ingredients
        description: `Ingredient: ${ingredient.unit_type}`
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Transform the created product back to ingredient format
    const createdIngredient: Ingredient = {
      id: data.id,
      name: data.name,
      unit_type: ingredient.unit_type,
      store_id: data.store_id,
      stock_quantity: data.stock_quantity || 0,
      cost_per_unit: data.cost || 0,
      is_active: data.is_active || true,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
    
    toast.success("Ingredient created successfully");
    return createdIngredient;
  } catch (error) {
    console.error("Error creating ingredient:", error);
    toast.error("Failed to create ingredient");
    return null;
  }
};
