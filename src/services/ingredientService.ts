
import { supabase } from "@/integrations/supabase/client";
import { Ingredient } from "@/types";
import { toast } from "sonner";

// Fetch all ingredients for a store
export const fetchIngredients = async (storeId: string): Promise<Ingredient[]> => {
  try {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("store_id", storeId)
      .order("name");
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
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
      .from("ingredients")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching ingredient:", error);
    toast.error("Failed to load ingredient details");
    return null;
  }
};

// Create a new ingredient
export const createIngredient = async (ingredient: Omit<Ingredient, "id">): Promise<Ingredient | null> => {
  try {
    const { data, error } = await supabase
      .from("ingredients")
      .insert(ingredient)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Ingredient created successfully");
    return data;
  } catch (error) {
    console.error("Error creating ingredient:", error);
    toast.error("Failed to create ingredient");
    return null;
  }
};

// Update an ingredient
export const updateIngredient = async (id: string, updates: Partial<Ingredient>): Promise<Ingredient | null> => {
  try {
    const { data, error } = await supabase
      .from("ingredients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Ingredient updated successfully");
    return data;
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
      .from("ingredients")
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
      .from("ingredients")
      .select("stock_quantity")
      .eq("id", id)
      .single();
    
    if (fetchError) {
      throw new Error(fetchError.message);
    }
    
    const previousQuantity = ingredient?.stock_quantity || 0;
    
    // Update the ingredient quantity
    const { error: updateError } = await supabase
      .from("ingredients")
      .update({ stock_quantity: newQuantity })
      .eq("id", id);
    
    if (updateError) {
      throw new Error(updateError.message);
    }
    
    // Create inventory transaction record
    const { error: transactionError } = await supabase
      .from("ingredient_transactions")
      .insert({
        ingredient_id: id,
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
