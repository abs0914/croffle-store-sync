
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const deductIngredientsForProduct = async (
  productId: string,
  quantity: number,
  transactionId: string
): Promise<boolean> => {
  try {
    console.log('🔄 Starting ingredient deduction for product:', { productId, quantity, transactionId });

    // CRITICAL FIX: Handle product ID mapping between catalog and products table
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
      
      // Now find the corresponding product in products table by name and store
      const { data: productsInfo } = await supabase
        .from('products')
        .select('id')
        .eq('name', catalogInfo.product_name)
        .eq('store_id', catalogInfo.store_id)
        .maybeSingle();
      
      if (productsInfo) {
        actualProductId = productsInfo.id;
        console.log('🔄 Mapped catalog ID to products ID:', { catalogId: productId, productsId: actualProductId });
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
      }
    }

    if (!productInfo) {
      console.error('❌ Product not found in either catalog or products table:', productId);
      throw new Error(`Product not found: ${productId}`);
    }

    console.log('📦 Product details:', { 
      productName: productInfo?.product_name, 
      recipeId: productInfo?.recipe_id 
    });

    // Optimized ingredient fetching with single query using JOINs
    // Use original productId (catalog ID) for ingredients since they're linked to catalog
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    if (ingredientsError) throw ingredientsError;

    let finalIngredients = ingredients || [];

    // If no product ingredients found, check recipe ingredients with simplified query
    if (finalIngredients.length === 0 && productInfo?.recipe_id) {
      console.log('No product ingredients found, checking recipe ingredients...');
      
      const { data: recipeIngredients, error: recipeError } = await supabase
        .from('recipe_ingredients')
        .select(`
          *,
          inventory_item:inventory_stock(*)
        `)
        .eq('recipe_id', productInfo.recipe_id);

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
    
    // Debug: Log first few ingredients to understand the multiplication
    if (finalIngredients.length > 10) {
      console.warn('🔍 Debug: Too many ingredients found, first 5:', finalIngredients.slice(0, 5).map(ing => ({
        id: ing.id,
        inventory_stock_id: ing.inventory_stock_id,
        quantity: ing.required_quantity,
        item_name: ing.inventory_item?.item,
        store_id: ing.inventory_item?.store_id
      })));
    }

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
            movement_type: 'sale',
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
