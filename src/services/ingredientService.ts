
import { supabase } from "@/integrations/supabase/client";
import { Ingredient } from "@/types";
import { toast } from "sonner";

// Fetch all ingredients for a store - using direct SQL query instead of ORM
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

// Delete an ingredient
export const deleteIngredient = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq("id", id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Ingredient deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting ingredient:", error);
    toast.error("Failed to delete ingredient");
    return false;
  }
};

// Update ingredient stock quantity
export const updateIngredientStock = async (
  id: string,
  newQuantity: number,
  transactionType: 'purchase' | 'sale' | 'adjustment' | 'return' | 'transfer',
  storeId: string,
  userId: string,
  notes?: string
): Promise<boolean> => {
  try {
    // Get current quantity first
    const { data: ingredient, error: fetchError } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", id)
      .single();
    
    if (fetchError) {
      throw new Error(fetchError.message);
    }
    
    const previousQuantity = ingredient?.stock_quantity || 0;
    
    // Update the ingredient quantity
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock_quantity: newQuantity })
      .eq("id", id);
    
    if (updateError) {
      throw new Error(updateError.message);
    }
    
    // Create inventory transaction record
    const { error: transactionError } = await supabase
      .from("inventory_transactions")
      .insert({
        product_id: id,
        store_id: storeId,
        transaction_type: transactionType,
        quantity: Math.abs(newQuantity - previousQuantity),
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        created_by: userId,
        notes
      });
    
    if (transactionError) {
      throw new Error(transactionError.message);
    }
    
    toast.success("Ingredient stock updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating ingredient stock:", error);
    toast.error("Failed to update ingredient stock");
    return false;
  }
};
