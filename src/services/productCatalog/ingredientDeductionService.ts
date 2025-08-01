
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const deductIngredientsForProduct = async (
  productId: string,
  quantity: number,
  transactionId: string
): Promise<boolean> => {
  try {
    console.log('🔄 Starting ingredient deduction for product:', { productId, quantity, transactionId });

    // First, get product details for better logging
    const { data: productInfo, error: productInfoError } = await supabase
      .from('product_catalog')
      .select('product_name, recipe_id')
      .eq('id', productId)
      .single();

    if (productInfoError) {
      console.error('❌ Failed to get product info:', productInfoError);
      throw productInfoError;
    }

    console.log('📦 Product details:', { 
      productName: productInfo?.product_name, 
      recipeId: productInfo?.recipe_id 
    });

    // Get product ingredients (primary path)
    const { data: productIngredients, error: productError } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    if (productError) throw productError;

    let ingredients = productIngredients || [];

    // If no product ingredients found, check recipe ingredients (fallback path)
    if (ingredients.length === 0) {
      console.log('No product ingredients found, checking recipe ingredients...');
      
      const { data: productCatalog, error: catalogError } = await supabase
        .from('product_catalog')
        .select('recipe_id')
        .eq('id', productId)
        .single();

      if (catalogError) throw catalogError;

      if (productCatalog?.recipe_id) {
        const { data: recipeIngredients, error: recipeError } = await supabase
          .from('recipe_ingredients')
          .select(`
            *,
            inventory_item:inventory_stock(*)
          `)
          .eq('recipe_id', productCatalog.recipe_id);

        if (recipeError) throw recipeError;

        // Map recipe ingredients to product ingredient format
        ingredients = recipeIngredients?.map(ri => ({
          ...ri,
          product_catalog_id: productId,
          required_quantity: ri.quantity,
          inventory_stock_id: ri.inventory_stock_id
        })) || [];
      }
    }

    if (ingredients.length === 0) {
      console.warn('⚠️ No ingredients configured for product:', {
        productId,
        productName: productInfo?.product_name,
        recipeId: productInfo?.recipe_id
      });
      toast.error(`No ingredients configured for "${productInfo?.product_name}". Please set up ingredients before selling.`);
      return false; // Prevent sale of products without ingredient configuration
    }

    console.log(`✅ Found ${ingredients.length} ingredients for product "${productInfo?.product_name}"`);

    // Process each ingredient deduction
    for (const ingredient of ingredients) {
      const deductionAmount = ingredient.required_quantity * quantity;
      const currentStock = ingredient.inventory_item?.stock_quantity || 0;
      const newStock = currentStock - deductionAmount;

      console.log(`🔍 Processing ingredient: ${ingredient.inventory_item?.item}`, {
        required: ingredient.required_quantity,
        quantity,
        deductionAmount,
        currentStock,
        newStock
      });

      if (newStock < 0) {
        console.error(`❌ Insufficient stock for ingredient:`, {
          ingredient: ingredient.inventory_item?.item,
          required: deductionAmount,
          available: currentStock,
          shortfall: Math.abs(newStock)
        });
        toast.error(`Insufficient stock for ${ingredient.inventory_item?.item || 'ingredient'}. Need ${deductionAmount}, have ${currentStock}`);
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

    console.log(`✅ Successfully deducted ingredients for product "${productInfo?.product_name}" (${productId})`);
    return true;
  } catch (error) {
    console.error('Error deducting ingredients:', error);
    toast.error('Failed to process ingredient deductions');
    return false;
  }
};
