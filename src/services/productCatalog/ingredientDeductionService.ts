
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IngredientDeduction {
  inventory_stock_id: string;
  quantity_to_deduct: number;
  current_stock: number;
}

export const checkIngredientAvailability = async (
  productId: string,
  quantity: number = 1
): Promise<{ available: boolean; insufficientItems: string[] }> => {
  try {
    const { data: ingredients, error } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    if (error) throw error;

    const insufficientItems: string[] = [];
    let available = true;

    for (const ingredient of ingredients || []) {
      const requiredQuantity = ingredient.required_quantity * quantity;
      const currentStock = ingredient.inventory_item?.stock_quantity || 0;

      if (currentStock < requiredQuantity) {
        available = false;
        insufficientItems.push(ingredient.inventory_item?.item || 'Unknown item');
      }
    }

    return { available, insufficientItems };
  } catch (error) {
    console.error('Error checking ingredient availability:', error);
    return { available: false, insufficientItems: [] };
  }
};

export const deductIngredientsForProduct = async (
  productId: string,
  quantity: number = 1,
  transactionId?: string
): Promise<boolean> => {
  try {
    // First check availability
    const { available, insufficientItems } = await checkIngredientAvailability(productId, quantity);
    
    if (!available) {
      toast.error(`Insufficient stock for: ${insufficientItems.join(', ')}`);
      return false;
    }

    // Get all ingredients for the product
    const { data: ingredients, error } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    if (error) throw error;

    // Deduct each ingredient
    for (const ingredient of ingredients || []) {
      const quantityToDeduct = ingredient.required_quantity * quantity;
      const currentStock = ingredient.inventory_item?.stock_quantity || 0;
      const newStock = currentStock - quantityToDeduct;

      // Update inventory stock
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ stock_quantity: newStock })
        .eq('id', ingredient.inventory_stock_id);

      if (updateError) throw updateError;

      // Create inventory transaction record
      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert({
          store_id: ingredient.inventory_item?.store_id,
          product_id: ingredient.inventory_stock_id,
          transaction_type: 'sale_deduction',
          quantity: quantityToDeduct,
          previous_quantity: currentStock,
          new_quantity: newStock,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          reference_id: transactionId,
          notes: `Automatic deduction for product sale`
        });

      if (transactionError) {
        console.error('Failed to create transaction record:', transactionError);
        // Don't fail the whole operation for transaction logging issues
      }
    }

    return true;
  } catch (error) {
    console.error('Error deducting ingredients:', error);
    toast.error('Failed to deduct ingredients from inventory');
    return false;
  }
};

export const getProductIngredients = async (productId: string): Promise<IngredientDeduction[]> => {
  try {
    const { data: ingredients, error } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    if (error) throw error;

    return (ingredients || []).map(ingredient => ({
      inventory_stock_id: ingredient.inventory_stock_id,
      quantity_to_deduct: ingredient.required_quantity,
      current_stock: ingredient.inventory_item?.stock_quantity || 0
    }));
  } catch (error) {
    console.error('Error fetching product ingredients:', error);
    return [];
  }
};
