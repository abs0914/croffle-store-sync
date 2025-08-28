
import { supabase } from "@/integrations/supabase/client";
import { ProductCatalog, ProductIngredient, ProductStatus } from "./types";
import { toast } from "sonner";

// Cache invalidation helper - now using proper broadcast method
const broadcastCacheInvalidation = async (productId: string, storeId: string, eventType: 'UPDATE' | 'INSERT' | 'DELETE') => {
  try {
    console.log(`Broadcasting cache invalidation for product ${productId} in store ${storeId}`);
    
    // Create a temporary channel for broadcasting
    const channel = supabase.channel('cache_invalidation_temp');
    
    // Send the broadcast message
    const result = await channel.send({
      type: 'broadcast',
      event: 'product_catalog_changed',
      payload: {
        productId,
        storeId,
        eventType,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`Cache invalidation broadcast result:`, result);
    
    // Clean up the temporary channel
    await supabase.removeChannel(channel);
    
    console.log(`Cache invalidation broadcasted successfully for product ${productId} in store ${storeId}`);
  } catch (error) {
    console.warn('Failed to broadcast cache invalidation:', error);
    // Don't throw error as this is not critical for the main operation
  }
};

export const fetchProductCatalog = async (storeId: string): Promise<ProductCatalog[]> => {
  try {
    // Use safe query without cross-table joins to avoid RLS issues
    const { data, error } = await supabase
      .from('product_catalog')
      .select(`
        id, product_name, description, price, category_id, store_id,
        image_url, is_available, product_status, recipe_id, display_order,
        created_at, updated_at
      `)
      .eq('store_id', storeId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    console.log(`✅ fetchProductCatalog: Retrieved ${(data || []).length} products for store ${storeId}`);
    return (data || []) as any;
  } catch (error) {
    console.error('Error fetching product catalog:', error);
    toast.error('Failed to fetch product catalog');
    return [];
  }
};

export const createProduct = async (
  product: Omit<ProductCatalog, 'id' | 'created_at' | 'updated_at' | 'ingredients'>,
  ingredients: Omit<ProductIngredient, 'id' | 'product_catalog_id' | 'created_at'>[]
): Promise<ProductCatalog | null> => {
  try {
    const { data: productData, error: productError } = await supabase
      .from('product_catalog')
      .insert(product)
      .select()
      .single();

    if (productError) throw productError;

    if (ingredients.length > 0) {
      const { error: ingredientsError } = await supabase
        .from('product_ingredients')
        .insert(
          ingredients.map(ing => ({
            ...ing,
            product_catalog_id: productData.id
          }))
        );

      if (ingredientsError) throw ingredientsError;
    }

    // Broadcast cache invalidation for new product
    await broadcastCacheInvalidation(productData.id, productData.store_id, 'INSERT');

    toast.success('Product created successfully');
    return productData as any;
  } catch (error) {
    console.error('Error creating product:', error);
    toast.error('Failed to create product');
    return null;
  }
};

export const updateProduct = async (
  id: string,
  updates: Partial<ProductCatalog>
): Promise<boolean> => {
  try {
    console.log('🔄 Product Catalog: Starting update for product:', id);
    console.log('📝 Product Catalog: Update data:', updates);

    // First get the existing product data including recipe_id
    const { data: existingProduct } = await supabase
      .from('product_catalog')
      .select('store_id, recipe_id, product_name, price')
      .eq('id', id)
      .single();

    if (!existingProduct) {
      console.error('❌ Product Catalog: Product not found:', id);
      throw new Error('Product not found');
    }

    console.log('📊 Product Catalog: Current product data:', existingProduct);

    // Check if price is being updated
    if (updates.price !== undefined && updates.price !== existingProduct.price) {
      console.log(`💰 Product Catalog: Price change detected - FROM: ₱${existingProduct.price} TO: ₱${updates.price}`);
    }

    // Update the product catalog
    const { error } = await supabase
      .from('product_catalog')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('❌ Product Catalog: Update failed:', error);
      
      // Provide more user-friendly error messages
      let userMessage = 'Failed to update product';
      if (error.message?.includes('already exists')) {
        userMessage = 'A product with this name already exists in the store. Please use a different name.';
      } else if (error.message?.includes('constraint')) {
        userMessage = 'This update conflicts with existing data. Please check for duplicate names or SKUs.';
      } else if (error.message?.includes('permission')) {
        userMessage = 'You do not have permission to update this product.';
      } else if (error.message) {
        userMessage = `Update failed: ${error.message}`;
      }
      
      const enhancedError = new Error(userMessage);
      (enhancedError as any).originalError = error;
      throw enhancedError;
    }

    console.log('✅ Product Catalog: Successfully updated product catalog entry');

    // Sync changes to related product table if it exists
    if ((updates.price !== undefined || updates.image_url !== undefined) && existingProduct.product_name) {
      console.log('🔗 Product Catalog: Syncing changes to products table...');
      
      // Find and update corresponding product in products table
      const { data: productTableEntry } = await supabase
        .from('products')
        .select('id, price, image_url')
        .eq('name', existingProduct.product_name)
        .eq('store_id', existingProduct.store_id)
        .maybeSingle();

      if (productTableEntry) {
        const productUpdates: any = {};
        
        if (updates.price !== undefined) {
          console.log(`📦 Product Catalog: Found matching product in products table - Current price: ₱${productTableEntry.price}`);
          productUpdates.price = updates.price;
        }
        
        if (updates.image_url !== undefined) {
          console.log(`🖼️ Product Catalog: Syncing image URL to products table`);
          productUpdates.image_url = updates.image_url;
        }
        
        const { error: productUpdateError } = await supabase
          .from('products')
          .update(productUpdates)
          .eq('id', productTableEntry.id);

        if (productUpdateError) {
          console.warn('⚠️ Product Catalog: Failed to sync changes to products table:', productUpdateError);
        } else {
          console.log(`✅ Product Catalog: Successfully synced changes to products table`);
          if (updates.price !== undefined) {
            console.log(`   - New price: ₱${updates.price}`);
          }
          if (updates.image_url !== undefined) {
            console.log(`   - New image URL: ${updates.image_url}`);
          }
        }
      } else {
        console.log('ℹ️ Product Catalog: No matching product found in products table to sync');
      }
    }

    // Broadcast cache invalidation for updated product
    console.log('📡 Product Catalog: Broadcasting cache invalidation...');
    await broadcastCacheInvalidation(id, existingProduct.store_id, 'UPDATE');
    console.log('✅ Product Catalog: Cache invalidation broadcasted successfully');

    // Don't show toast here - let the component handle it
    console.log('✅ Product Catalog: Product updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Product Catalog: Error updating product:', error);
    // Don't show toast here - let the component handle it with rollback
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_catalog')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('Product deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    toast.error('Failed to delete product');
    return false;
  }
};

export const toggleProductAvailability = async (
  id: string,
  isAvailable: boolean
): Promise<boolean> => {
  try {
    // First get the store_id for cache invalidation
    const { data: existingProduct } = await supabase
      .from('product_catalog')
      .select('store_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('product_catalog')
      .update({ is_available: isAvailable })
      .eq('id', id);

    if (error) throw error;

    // Broadcast cache invalidation for availability change
    if (existingProduct?.store_id) {
      await broadcastCacheInvalidation(id, existingProduct.store_id, 'UPDATE');
    }

    // Don't show toast here - let the component handle it
    console.log(`✅ Product Catalog: Product ${isAvailable ? 'enabled' : 'disabled'} successfully`);
    return true;
  } catch (error) {
    console.error('Error updating product availability:', error);
    // Don't show toast here - let the component handle it with rollback
    throw error;
  }
};

export const updateProductStatus = async (
  id: string,
  status: ProductStatus,
  isAvailable: boolean
): Promise<boolean> => {
  try {
    // First get the store_id for cache invalidation
    const { data: existingProduct } = await supabase
      .from('product_catalog')
      .select('store_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('product_catalog')
      .update({
        product_status: status,
        is_available: isAvailable
      })
      .eq('id', id);

    if (error) throw error;

    // Broadcast cache invalidation for status change
    if (existingProduct?.store_id) {
      await broadcastCacheInvalidation(id, existingProduct.store_id, 'UPDATE');
    }

    const statusLabels = {
      available: 'available',
      out_of_stock: 'out of stock',
      temporarily_unavailable: 'temporarily unavailable',
      discontinued: 'discontinued'
    };

    // Don't show toast here - let the component handle it
    console.log(`✅ Product Catalog: Product marked as ${statusLabels[status]}`);
    return true;
  } catch (error) {
    console.error('Error updating product status:', error);
    // Don't show toast here - let the component handle it with rollback
    throw error;
  }
};
