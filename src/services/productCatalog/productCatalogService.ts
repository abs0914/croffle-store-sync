
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
    const { data, error } = await supabase
      .from('product_catalog')
      .select(`
        *,
        ingredients:product_ingredients(
          *,
          inventory_item:inventory_stock(*)
        )
      `)
      .eq('store_id', storeId)
      .order('display_order');

    if (error) throw error;
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
    // First get the existing product data including recipe_id
    const { data: existingProduct } = await supabase
      .from('product_catalog')
      .select('store_id, recipe_id, product_name')
      .eq('id', id)
      .single();

    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Update the product catalog
    const { error } = await supabase
      .from('product_catalog')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    // If price was updated, also update related product table if it exists
    if (updates.price !== undefined && existingProduct.product_name) {
      // Find and update corresponding product in products table
      const { data: productTableEntry } = await supabase
        .from('products')
        .select('id')
        .eq('name', existingProduct.product_name)
        .eq('store_id', existingProduct.store_id)
        .maybeSingle();

      if (productTableEntry) {
        const { error: productUpdateError } = await supabase
          .from('products')
          .update({ price: updates.price })
          .eq('id', productTableEntry.id);

        if (productUpdateError) {
          console.warn('Failed to sync price to products table:', productUpdateError);
        }
      }
    }

    // Broadcast cache invalidation for updated product
    await broadcastCacheInvalidation(id, existingProduct.store_id, 'UPDATE');

    toast.success('Product updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating product:', error);
    toast.error('Failed to update product');
    return false;
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

    toast.success(`Product ${isAvailable ? 'enabled' : 'disabled'} successfully`);
    return true;
  } catch (error) {
    console.error('Error updating product availability:', error);
    toast.error('Failed to update product availability');
    return false;
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

    toast.success(`Product marked as ${statusLabels[status]}`);
    return true;
  } catch (error) {
    console.error('Error updating product status:', error);
    toast.error('Failed to update product status');
    return false;
  }
};
