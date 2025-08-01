
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const deductIngredientsForProduct = async (
  productId: string,
  quantity: number,
  transactionId: string
): Promise<boolean> => {
  try {
    console.log('Deducting ingredients for product:', { productId, quantity, transactionId });

    // Get product ingredients
    const { data: ingredients, error } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    if (error) throw error;

    if (!ingredients || ingredients.length === 0) {
      console.warn('No ingredients found for product:', productId);
      return true; // Allow products without ingredients
    }

    // Process each ingredient deduction
    for (const ingredient of ingredients) {
      const deductionAmount = ingredient.required_quantity * quantity;
      const currentStock = ingredient.inventory_item?.stock_quantity || 0;
      const newStock = currentStock - deductionAmount;

      if (newStock < 0) {
        toast.error(`Insufficient stock for ${ingredient.inventory_item?.item || 'ingredient'}`);
        return false;
      }

      // Update inventory stock
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ stock_quantity: newStock })
        .eq('id', ingredient.inventory_stock_id);

      if (updateError) throw updateError;

      // Create movement record only if transactionId is a valid UUID (not temporary)
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
      const isTemporaryId = transactionId.startsWith('temp-');
      
      if (isValidUUID && !isTemporaryId) {
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: ingredient.inventory_stock_id,
            movement_type: 'sale_deduction',
            quantity_change: -deductionAmount,
            previous_quantity: currentStock,
            new_quantity: newStock,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            reference_type: 'transaction',
            reference_id: transactionId,
            notes: `Product sale: ${ingredient.inventory_item?.item} (${deductionAmount} ${ingredient.unit})`
          });

        if (movementError) {
          console.error('Failed to create movement record:', movementError);
          // Don't fail the entire transaction for logging issues
        }
      } else {
        console.log('Skipping movement record creation - temporary transaction ID:', transactionId);
      }
    }

    console.log('Successfully deducted ingredients for product:', productId);
    return true;
  } catch (error) {
    console.error('Error deducting ingredients:', error);
    toast.error('Failed to process ingredient deductions');
    return false;
  }
};
