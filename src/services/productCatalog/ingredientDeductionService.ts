import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const deductIngredientsForProduct = async (
  productId: string,
  quantity: number,
  transactionId: string
): Promise<boolean> => {
  try {
    console.log('🔄 Starting ingredient deduction for product:', { productId, quantity, transactionId });

    // Track sync timing for audit
    const syncStartTime = Date.now();

    // Handle product ID mapping between catalog and products table
    let actualProductId = productId;
    let productInfo: any = null;

    // First try to get from product_catalog (transaction might use catalog ID)
    const { data: catalogInfo, error: catalogError } = await supabase
      .from('product_catalog')
      .select('product_name, recipe_id, store_id')
      .eq('id', productId)
      .maybeSingle();

    if (catalogInfo) {
      productInfo = catalogInfo;
      console.log('📦 Found product in catalog:', catalogInfo.product_name);
    } else {
      // If not found in catalog, try products table directly
      const { data: directProductInfo, error: productInfoError } = await supabase
        .from('products')
        .select('name, recipe_id')
        .eq('id', productId)
        .maybeSingle();
      
      if (directProductInfo) {
        productInfo = { product_name: directProductInfo.name, recipe_id: directProductInfo.recipe_id };
        console.log('📦 Found product directly in products table:', directProductInfo.name);
      }
    }

    if (!productInfo) {
      console.error('❌ Product not found in either catalog or products table:', productId);
      
      // Log failure to audit system
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'failed',
        p_error_details: `Product not found: ${productId}`,
        p_items_processed: 0,
        p_sync_duration_ms: Date.now() - syncStartTime
      });
      
      return false;
    }

    // Get ingredients
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    if (ingredientsError) {
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'failed',
        p_error_details: `Failed to fetch ingredients: ${ingredientsError.message}`,
        p_items_processed: 0,
        p_sync_duration_ms: Date.now() - syncStartTime
      });
      throw ingredientsError;
    }

    let finalIngredients = ingredients || [];

    // If no product ingredients found, check recipe ingredients
    if (finalIngredients.length === 0 && productInfo?.recipe_id) {
      console.log('No product ingredients found, checking recipe ingredients...');
      
      const { data: recipeIngredients, error: recipeError } = await supabase
        .from('recipe_ingredients')
        .select(`
          *,
          inventory_item:inventory_stock(*)
        `)
        .eq('recipe_id', productInfo.recipe_id);

      if (recipeError) {
        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: transactionId,
          p_sync_status: 'failed',
          p_error_details: `Failed to fetch recipe ingredients: ${recipeError.message}`,
          p_items_processed: 0,
          p_sync_duration_ms: Date.now() - syncStartTime
        });
        throw recipeError;
      }

      // Map recipe ingredients to product ingredient format
      finalIngredients = recipeIngredients?.map(ri => ({
        ...ri,
        product_catalog_id: productId,
        required_quantity: ri.quantity,
        inventory_stock_id: ri.inventory_stock_id
      })) || [];
    }

    if (finalIngredients.length === 0) {
      console.warn('⚠️ No ingredients configured for product:', productInfo?.product_name);
      toast.error(`No ingredients configured for "${productInfo?.product_name}"`);
      
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'failed',
        p_error_details: `No ingredients configured for product: ${productInfo?.product_name}`,
        p_items_processed: 0,
        p_sync_duration_ms: Date.now() - syncStartTime
      });
      
      return false;
    }

    // Validate stock and prepare updates
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
          available: currentStock
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

    // Check for insufficient stock
    if (insufficientStock.length > 0) {
      console.error('❌ Insufficient stock for ingredients:', insufficientStock);
      
      const errorDetails = insufficientStock.map(item => 
        `${item.ingredient}: need ${item.required}, have ${item.available}`
      ).join('; ');
      
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'failed',
        p_error_details: `Insufficient stock: ${errorDetails}`,
        p_items_processed: 0,
        p_sync_duration_ms: Date.now() - syncStartTime
      });
      
      return false;
    }

    // Update inventory
    let processedCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ stock_quantity: update.newStock })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`❌ Failed to update ${update.item}:`, updateError);
        
        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: transactionId,
          p_sync_status: 'failed',
          p_error_details: `Failed to update ${update.item}: ${updateError.message}`,
          p_items_processed: processedCount,
          p_sync_duration_ms: Date.now() - syncStartTime
        });
        
        return false;
      }

      // Create movement record
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
      
      if (isValidUUID) {
        await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: update.id,
            movement_type: 'sale',
            quantity_change: -update.deductionAmount,
            previous_quantity: update.currentStock,
            new_quantity: update.newStock,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            reference_type: 'transaction',
            reference_id: transactionId,
            notes: `Product sale: ${update.item}`
          });
      }
      
      processedCount++;
    }

    // Log successful sync to audit system
    await supabase.rpc('log_inventory_sync_result', {
      p_transaction_id: transactionId,
      p_sync_status: 'success',
      p_error_details: null,
      p_items_processed: processedCount,
      p_sync_duration_ms: Date.now() - syncStartTime
    });

    console.log(`✅ Successfully deducted ingredients for product "${productInfo?.product_name}"`);
    return true;
    
  } catch (error) {
    console.error('❌ Critical ingredient deduction error:', error);
    
    // Log critical error to audit system
    const errorMessage = error instanceof Error ? error.message : String(error);
    await supabase.rpc('log_inventory_sync_result', {
      p_transaction_id: transactionId,
      p_sync_status: 'failed',
      p_error_details: `Critical error: ${errorMessage}`,
      p_items_processed: 0,
      p_sync_duration_ms: null
    });
    
    return false;
  }
};