
import { supabase } from "@/integrations/supabase/client";
import { Ingredient } from "@/types";
import { toast } from "sonner";

// Fetch all ingredients for a store
export const fetchIngredients = async (storeId: string): Promise<Ingredient[]> => {
  try {
    // Using a direct SQL query since the ingredients table might not be in the types yet
    const { data, error } = await supabase
      .from('products')  // Temporarily using products table
      .select("*")
      .eq("store_id", storeId)
      .order("name");
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Transform products to ingredients format
    const ingredients: Ingredient[] = data.map(product => ({
      id: product.id,
      name: product.name,
      unit: 'pieces', // Default unit
      unit_type: 'pieces' as const,  // Default unit type
      store_id: product.store_id,
      stock_quantity: product.stock_quantity || 0,
      cost_per_unit: product.cost || 0,
      is_active: product.is_active || true,
      created_at: product.created_at,
      updated_at: product.updated_at
    }));
    
    return ingredients;
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    toast.error("Failed to load ingredients");
    return [];
  }
};

// Fetch a single ingredient
export const fetchIngredient = async (id: string): Promise<Ingredient | null> => {
  try {
    const { data, error } = await supabase
      .from('products')  // Temporarily using products table
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Transform product to ingredient format
    const ingredient: Ingredient = {
      id: data.id,
      name: data.name,
      unit: 'pieces', // Default unit
      unit_type: 'pieces' as const,  // Default unit type
      store_id: data.store_id,
      stock_quantity: data.stock_quantity || 0,
      cost_per_unit: data.cost || 0,
      is_active: data.is_active || true,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
    
    return ingredient;
  } catch (error) {
    console.error("Error fetching ingredient:", error);
    toast.error("Failed to load ingredient details");
    return null;
  }
};
