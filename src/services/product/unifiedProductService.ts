import { supabase } from "@/integrations/supabase/client";
import { Product, Category } from "@/types";
import { ProductCatalog } from "@/services/productCatalog/types";
import { toast } from "sonner";

export interface UnifiedProductUpdate {
  name?: string;
  description?: string;
  price?: number;
  image_url?: string;
  category_id?: string | null;
  is_active?: boolean;
  display_order?: number;
}

export interface SyncResult {
  success: boolean;
  productCatalogUpdated: boolean;
  productsTableUpdated: boolean;
  error?: string;
}

// Cache invalidation helper
const broadcastCacheInvalidation = async (productId: string, storeId: string, eventType: 'UPDATE' | 'INSERT' | 'DELETE') => {
  try {
    console.log(`Broadcasting cache invalidation for product ${productId} in store ${storeId}`);
    
    const channel = supabase.channel('cache_invalidation_temp');
    
    await channel.send({
      type: 'broadcast',
      event: 'product_catalog_changed',
      payload: {
        productId,
        storeId,
        eventType,
        timestamp: new Date().toISOString()
      }
    });

    await supabase.removeChannel(channel);
    console.log(`Cache invalidation broadcasted successfully`);
  } catch (error) {
    console.warn('Failed to broadcast cache invalidation:', error);
  }
};

export const unifiedProductService = {
  /**
   * Update a product in both product_catalog and products tables
   * This ensures data consistency across both tables
   */
  async updateProduct(
    productCatalogId: string, 
    updates: UnifiedProductUpdate
  ): Promise<SyncResult> {
    try {
      console.log('🔄 Unified Service: Starting product update for:', productCatalogId);
      console.log('📝 Unified Service: Update data:', updates);

      // First get the existing product catalog data
      const { data: existingProduct } = await supabase
        .from('product_catalog')
        .select('store_id, recipe_id, product_name, price, image_url, category_id')
        .eq('id', productCatalogId)
        .single();

      if (!existingProduct) {
        throw new Error('Product not found in catalog');
      }

      console.log('📊 Unified Service: Current product data:', existingProduct);

      // Prepare catalog updates
      const catalogUpdates: Partial<ProductCatalog> = {};
      if (updates.name !== undefined) catalogUpdates.product_name = updates.name;
      if (updates.description !== undefined) catalogUpdates.description = updates.description;
      if (updates.price !== undefined) catalogUpdates.price = updates.price;
      if (updates.image_url !== undefined) catalogUpdates.image_url = updates.image_url;
      if (updates.category_id !== undefined) catalogUpdates.category_id = updates.category_id;
      if (updates.is_active !== undefined) catalogUpdates.is_available = updates.is_active;
      if (updates.display_order !== undefined) catalogUpdates.display_order = updates.display_order;

      // Update product catalog
      const { error: catalogError } = await supabase
        .from('product_catalog')
        .update(catalogUpdates)
        .eq('id', productCatalogId);

      if (catalogError) {
        console.error('❌ Unified Service: Catalog update failed:', catalogError);
        throw catalogError;
      }

      console.log('✅ Unified Service: Product catalog updated successfully');

      // Sync to products table if a matching product exists
      let productsTableUpdated = false;
      
      const { data: productTableEntry } = await supabase
        .from('products')
        .select('id, name, price, image_url, category_id, is_active')
        .eq('name', existingProduct.product_name)
        .eq('store_id', existingProduct.store_id)
        .maybeSingle();

      if (productTableEntry) {
        console.log('🔗 Unified Service: Found matching product in products table, syncing...');
        
        // Prepare products table updates
        const productUpdates: Partial<Product> = {};
        if (updates.name !== undefined) productUpdates.name = updates.name;
        if (updates.description !== undefined) productUpdates.description = updates.description;
        if (updates.price !== undefined) productUpdates.price = updates.price;
        if (updates.image_url !== undefined) productUpdates.image_url = updates.image_url;
        if (updates.category_id !== undefined) productUpdates.category_id = updates.category_id;
        if (updates.is_active !== undefined) productUpdates.is_active = updates.is_active;

        const { error: productUpdateError } = await supabase
          .from('products')
          .update(productUpdates)
          .eq('id', productTableEntry.id);

        if (productUpdateError) {
          console.warn('⚠️ Unified Service: Failed to sync to products table:', productUpdateError);
        } else {
          console.log('✅ Unified Service: Successfully synced to products table');
          productsTableUpdated = true;
        }
      } else {
        console.log('ℹ️ Unified Service: No matching product found in products table');
      }

      // Broadcast cache invalidation
      await broadcastCacheInvalidation(productCatalogId, existingProduct.store_id, 'UPDATE');

      return {
        success: true,
        productCatalogUpdated: true,
        productsTableUpdated
      };

    } catch (error) {
      console.error('❌ Unified Service: Update failed:', error);
      return {
        success: false,
        productCatalogUpdated: false,
        productsTableUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Update a product from the products table and sync to product_catalog
   * This handles updates coming from the traditional product form
   */
  async updateFromProductsTable(
    productId: string,
    updates: Partial<Product>
  ): Promise<SyncResult> {
    try {
      console.log('🔄 Unified Service: Starting products table update for:', productId);

      // First get the existing product data
      const { data: existingProduct } = await supabase
        .from('products')
        .select('store_id, name, price, image_url, category_id, is_active, recipe_id')
        .eq('id', productId)
        .single();

      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // Update products table
      const { error: productError } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId);

      if (productError) {
        console.error('❌ Unified Service: Products table update failed:', productError);
        throw productError;
      }

      console.log('✅ Unified Service: Products table updated successfully');

      // Sync to product catalog if matching entry exists
      let productCatalogUpdated = false;
      
      const { data: catalogEntry } = await supabase
        .from('product_catalog')
        .select('id, product_name, price, image_url, category_id, is_available')
        .eq('product_name', existingProduct.name)
        .eq('store_id', existingProduct.store_id)
        .maybeSingle();

      if (catalogEntry) {
        console.log('🔗 Unified Service: Found matching product in catalog, syncing...');
        
        // Prepare catalog updates
        const catalogUpdates: Partial<ProductCatalog> = {};
        if (updates.name !== undefined) catalogUpdates.product_name = updates.name;
        if (updates.description !== undefined) catalogUpdates.description = updates.description;
        if (updates.price !== undefined) catalogUpdates.price = updates.price;
        if (updates.image_url !== undefined) catalogUpdates.image_url = updates.image_url;
        if (updates.category_id !== undefined) catalogUpdates.category_id = updates.category_id;
        if (updates.is_active !== undefined) catalogUpdates.is_available = updates.is_active;

        const { error: catalogUpdateError } = await supabase
          .from('product_catalog')
          .update(catalogUpdates)
          .eq('id', catalogEntry.id);

        if (catalogUpdateError) {
          console.warn('⚠️ Unified Service: Failed to sync to product catalog:', catalogUpdateError);
        } else {
          console.log('✅ Unified Service: Successfully synced to product catalog');
          productCatalogUpdated = true;
          
          // Broadcast cache invalidation for catalog update
          await broadcastCacheInvalidation(catalogEntry.id, existingProduct.store_id, 'UPDATE');
        }
      } else {
        console.log('ℹ️ Unified Service: No matching product found in catalog');
      }

      return {
        success: true,
        productCatalogUpdated,
        productsTableUpdated: true
      };

    } catch (error) {
      console.error('❌ Unified Service: Products table update failed:', error);
      return {
        success: false,
        productCatalogUpdated: false,
        productsTableUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Get unified product data from both tables
   */
  async getUnifiedProduct(productCatalogId: string): Promise<{
    catalog: ProductCatalog | null;
    product: Product | null;
    inSync: boolean;
  }> {
    try {
      // Get catalog data
      const { data: catalog } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('id', productCatalogId)
        .single();

      if (!catalog) {
        return { catalog: null, product: null, inSync: false };
      }

      // Find matching product
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('name', catalog.product_name)
        .eq('store_id', catalog.store_id)
        .maybeSingle();

      // Check if they're in sync
      let inSync = true;
      if (product && catalog) {
        inSync = (
          product.name === catalog.product_name &&
          product.price === catalog.price &&
          product.image_url === catalog.image_url &&
          product.category_id === catalog.category_id &&
          product.is_active === catalog.is_available
        );
      }

      return { catalog: catalog as ProductCatalog, product: product as Product, inSync };
    } catch (error) {
      console.error('Error getting unified product:', error);
      return { catalog: null, product: null, inSync: false };
    }
  }
};