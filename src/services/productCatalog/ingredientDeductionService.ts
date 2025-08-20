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
      
      // Special debugging for Mini Croffle products
      if (catalogInfo.product_name.toLowerCase().includes('mini croffle')) {
        console.log('🥐 MINI CROFFLE DEBUG - Product Info:', {
          productId,
          productName: catalogInfo.product_name,
          recipeId: catalogInfo.recipe_id,
          storeId: catalogInfo.store_id,
          quantity,
          transactionId
        });
      }
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
        
        // Special debugging for Mini Croffle products
        if (directProductInfo.name.toLowerCase().includes('mini croffle')) {
          console.log('🥐 MINI CROFFLE DEBUG - Direct Product Info:', {
            productId,
            productName: directProductInfo.name,
            recipeId: directProductInfo.recipe_id,
            quantity,
            transactionId
          });
        }
      }
    }

    if (!productInfo) {
      console.error('❌ Product not found in either catalog or products table:', productId);
      
      // Check current store to help with debugging
      const currentStoreId = 'e78ad702-1135-482d-a508-88104e2706cf'; // This should come from context
      
      // Try to find similar products for debugging
      const { data: similarProducts } = await supabase
        .from('product_catalog')
        .select('id, product_name, store_id')
        .ilike('product_name', '%mini%croffle%')
        .limit(10);
      
      console.error('🔍 Available Mini Croffle products:', similarProducts);
      
      // Check specifically for current store
      const { data: storeProducts } = await supabase
        .from('product_catalog')
        .select('id, product_name')
        .eq('store_id', currentStoreId)
        .ilike('product_name', '%mini%croffle%');
      
      console.error('🏪 Mini Croffle products for current store:', storeProducts);
      
      // Check if this might be a combo product ID
      if (productId.startsWith('combo-')) {
        console.error('🧩 This appears to be a combo product ID, but validation failed');
      }
      
      // Log failure to audit system
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'failed',
        p_error_details: `Product not found: ${productId}. Available Mini Croffle products: ${similarProducts?.map(p => `${p.product_name} (${p.id})`).join(', ') || 'none'}. Store products: ${storeProducts?.map(p => `${p.product_name} (${p.id})`).join(', ') || 'none'}`,
        p_items_processed: 0,
        p_sync_duration_ms: Date.now() - syncStartTime
      });
      
      toast.error(`Product not found. Expected ID for current store: ${storeProducts?.[0]?.id || 'none found'}`);
      return false;
    }

    // Check if this is a direct inventory product (1:1 mapping to inventory_stock)
    console.log('🔍 Checking for direct inventory mapping for:', productInfo.product_name);
    
    const { data: directInventoryItem, error: directError } = await supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity, serving_ready_quantity, unit, store_id')
      .eq('store_id', productInfo.store_id || 'e78ad702-1135-482d-a508-88104e2706cf')
      .eq('is_active', true)
      .or(`item.ilike.${productInfo.product_name},item.ilike.%${productInfo.product_name}%`)
      .limit(1)
      .maybeSingle();

    // Handle direct inventory products (beverages, finished goods)
    if (directInventoryItem && !directError) {
      console.log('🥤 Processing as direct inventory product:', {
        productName: productInfo.product_name,
        inventoryItem: directInventoryItem.item,
        currentStock: directInventoryItem.stock_quantity,
        quantity
      });

      const currentStock = directInventoryItem.serving_ready_quantity || directInventoryItem.stock_quantity || 0;
      const newStock = Math.max(0, currentStock - quantity);

      if (currentStock < quantity) {
        console.error('❌ Insufficient direct inventory stock:', {
          product: productInfo.product_name,
          required: quantity,
          available: currentStock
        });

        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: transactionId,
          p_sync_status: 'failed',
          p_error_details: `Insufficient stock for ${productInfo.product_name}: need ${quantity}, have ${currentStock}`,
          p_items_processed: 0,
          p_sync_duration_ms: Date.now() - syncStartTime
        });

        return false;
      }

      // Update direct inventory stock
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ 
          stock_quantity: newStock,
          serving_ready_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', directInventoryItem.id);

      if (updateError) {
        console.error('❌ Failed to update direct inventory:', updateError);
        
        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: transactionId,
          p_sync_status: 'failed', 
          p_error_details: `Failed to update direct inventory: ${updateError.message}`,
          p_items_processed: 0,
          p_sync_duration_ms: Date.now() - syncStartTime
        });

        return false;
      }

      // Create movement record for direct inventory
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
      
      if (isValidUUID) {
        await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: directInventoryItem.id,
            movement_type: 'sale',
            quantity_change: -quantity,
            previous_quantity: currentStock,
            new_quantity: newStock,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            reference_type: 'transaction',
            reference_id: transactionId,
            notes: `Direct product sale: ${productInfo.product_name}`
          });
      }

      // Log successful direct inventory sync
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'success',
        p_error_details: null,
        p_items_processed: 1,
        p_sync_duration_ms: Date.now() - syncStartTime
      });

      console.log(`✅ Successfully deducted direct inventory for "${productInfo.product_name}": ${currentStock} → ${newStock}`);
      return true;
    }

    // Fallback to recipe-based ingredient deduction
    console.log('📦 Processing as recipe-based product with ingredient mappings');

    // Get ingredients
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    if (ingredientsError) {
      // Special logging for Mini Croffle ingredient fetch errors
      if (productInfo?.product_name.toLowerCase().includes('mini croffle')) {
        console.error('🥐 MINI CROFFLE DEBUG - Ingredients Error:', {
          productId,
          productName: productInfo.product_name,
          error: ingredientsError.message,
          recipeId: productInfo.recipe_id
        });
      }
      
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
    
    // Special debugging for Mini Croffle ingredient lookup
    if (productInfo?.product_name.toLowerCase().includes('mini croffle')) {
      console.log('🥐 MINI CROFFLE DEBUG - Product Ingredients Found:', {
        productId,
        productName: productInfo.product_name,
        ingredientCount: finalIngredients.length,
        ingredients: finalIngredients.map(ing => ({
          id: ing.id,
          inventoryStockId: ing.inventory_stock_id,
          requiredQuantity: ing.required_quantity,
          item: ing.inventory_item?.item,
          currentStock: ing.inventory_item?.stock_quantity
        }))
      });
    }

    // If no product ingredients found, check recipe ingredients
    if (finalIngredients.length === 0 && productInfo?.recipe_id) {
      console.log('No product ingredients found, checking recipe ingredients...');
      
      // Special debugging for Mini Croffle recipe lookup
      if (productInfo.product_name.toLowerCase().includes('mini croffle')) {
        console.log('🥐 MINI CROFFLE DEBUG - Checking recipe ingredients for recipe ID:', productInfo.recipe_id);
      }
      
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
      
      // Special debugging for Mini Croffle recipe ingredients
      if (productInfo?.product_name.toLowerCase().includes('mini croffle')) {
        console.log('🥐 MINI CROFFLE DEBUG - Recipe Ingredients Found:', {
          productId,
          productName: productInfo.product_name,
          recipeId: productInfo.recipe_id,
          recipeIngredientCount: finalIngredients.length,
          recipeIngredients: finalIngredients.map(ing => ({
            id: ing.id,
            inventoryStockId: ing.inventory_stock_id,
            requiredQuantity: ing.required_quantity,
            item: ing.inventory_item?.item,
            currentStock: ing.inventory_item?.stock_quantity
          }))
        });
      }
    }

    if (finalIngredients.length === 0) {
      console.warn('⚠️ No ingredients configured for product:', productInfo?.product_name);
      
      // Special debugging for Mini Croffle no ingredients case
      if (productInfo?.product_name.toLowerCase().includes('mini croffle')) {
        console.error('🥐 MINI CROFFLE DEBUG - NO INGREDIENTS FOUND:', {
          productId,
          productName: productInfo.product_name,
          recipeId: productInfo.recipe_id,
          storeId: productInfo.store_id,
          searchedInProductIngredients: true,
          searchedInRecipeIngredients: !!productInfo.recipe_id,
          transactionId
        });
      }
      
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
      
      // Special debugging for Mini Croffle insufficient stock
      if (productInfo?.product_name.toLowerCase().includes('mini croffle')) {
        console.error('🥐 MINI CROFFLE DEBUG - INSUFFICIENT STOCK:', {
          productId,
          productName: productInfo.product_name,
          quantity,
          insufficientStock,
          allIngredients: finalIngredients.map(ing => ({
            item: ing.inventory_item?.item,
            required: ing.required_quantity * quantity,
            available: ing.inventory_item?.stock_quantity,
            shortfall: (ing.required_quantity * quantity) - (ing.inventory_item?.stock_quantity || 0)
          })),
          transactionId
        });
      }
      
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