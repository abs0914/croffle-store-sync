
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

    // Optimized ingredient fetching with single query using JOINs
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    if (ingredientsError) throw ingredientsError;

    let finalIngredients = ingredients || [];

    // If no product ingredients found, check recipe ingredients with optimized query
    if (finalIngredients.length === 0) {
      console.log('No product ingredients found, checking recipe ingredients...');
      
      const { data: recipeIngredients, error: recipeError } = await supabase
        .from('recipe_ingredients')
        .select(`
          *,
          inventory_item:inventory_stock(*),
          recipe:recipes!inner(id, products:product_catalog!recipe_id(id))
        `)
        .eq('recipe.products.id', productId);

      if (recipeError) throw recipeError;

      // Map recipe ingredients to product ingredient format
      finalIngredients = recipeIngredients?.map(ri => ({
        ...ri,
        product_catalog_id: productId,
        required_quantity: ri.quantity,
        inventory_stock_id: ri.inventory_stock_id
      })) || [];
    }

    if (finalIngredients.length === 0) {
      console.warn('⚠️ No ingredients configured for product:', {
        productId,
        productName: productInfo?.product_name,
        recipeId: productInfo?.recipe_id
      });
      toast.error(`No ingredients configured for "${productInfo?.product_name}". Please set up ingredients before selling.`);
      return false; // Prevent sale of products without ingredient configuration
    }

    console.log(`✅ Found ${finalIngredients.length} ingredients for product "${productInfo?.product_name}"`);

    // Batch validation: Check all ingredients first to fail fast
    const insufficientStock = [];
    const updates = [];
    
    for (const ingredient of finalIngredients) {
      const deductionAmount = ingredient.required_quantity * quantity;
      const currentStock = ingredient.inventory_item?.stock_quantity || 0;
      const newStock = currentStock - deductionAmount;

      if (newStock < 0) {
        insufficientStock.push({
          ingredient: ingredient.inventory_item?.item,
          required: deductionAmount,
          available: currentStock,
          shortfall: Math.abs(newStock)
        });
      } else {
        updates.push({
          id: ingredient.inventory_stock_id,
          newStock,
          deductionAmount,
          currentStock,
          item: ingredient.inventory_item?.item,
          unit: ingredient.unit
        });
      }
    }

    // Fail fast if any ingredient has insufficient stock
    if (insufficientStock.length > 0) {
      const errorMsg = insufficientStock.map(item => 
        `${item.ingredient}: need ${item.required}, have ${item.available}`
      ).join('; ');
      console.error('❌ Insufficient stock for ingredients:', insufficientStock);
      toast.error(`Insufficient stock: ${errorMsg}`);
      return false;
    }

    // Batch update all inventory items
    const updatePromises = updates.map(update => 
      supabase
        .from('inventory_stock')
        .update({ stock_quantity: update.newStock })
        .eq('id', update.id)
    );

    const updateResults = await Promise.allSettled(updatePromises);
    const failedUpdates = updateResults.filter(result => result.status === 'rejected');
    
    if (failedUpdates.length > 0) {
      console.error('❌ Some inventory updates failed:', failedUpdates);
      throw new Error(`Failed to update ${failedUpdates.length} inventory items`);
    }

    // Process movement records
    for (const update of updates) {
      console.log(`🔍 Processing movement for: ${update.item}`, {
        deductionAmount: update.deductionAmount,
        currentStock: update.currentStock,
        newStock: update.newStock
      });

      // Create movement record only if transactionId is a valid UUID (not temporary)
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
      const isTemporaryId = transactionId.startsWith('temp-');
      
      if (isValidUUID && !isTemporaryId) {
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: update.id,
            movement_type: 'sale_deduction',
            quantity_change: -update.deductionAmount,
            previous_quantity: update.currentStock,
            new_quantity: update.newStock,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            reference_type: 'transaction',
            reference_id: transactionId,
            notes: `Product sale: ${update.item} (${update.deductionAmount} ${update.unit})`
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Critical ingredient deduction error:', {
      error: errorMessage,
      productId,
      quantity,
      transactionId,
      timestamp: new Date().toISOString()
    });
    
    // Provide specific error feedback
    if (errorMessage.includes('permission denied')) {
      toast.error('Access denied for inventory updates - check user permissions');
    } else if (errorMessage.includes('foreign key')) {
      toast.error('Product or ingredient configuration error - please check setup');
    } else if (errorMessage.includes('null value')) {
      toast.error('Missing required data - please check product ingredient setup');
    } else {
      toast.error(`Ingredient processing failed: ${errorMessage}`);
    }
    
    return false;
  }
};
