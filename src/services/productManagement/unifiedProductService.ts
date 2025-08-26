import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/product";
import { toast } from "sonner";

export interface UnifiedProductUpdate {
  productName?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  isAvailable?: boolean;
  categoryId?: string;
}

export interface ProductSyncResult {
  success: boolean;
  message: string;
  affectedTables: string[];
  conflicts?: string[];
}

export const unifiedProductService = {
  // Update product across both product_catalog and products tables
  async updateProduct(
    storeId: string,
    recipeId: string,
    updates: UnifiedProductUpdate
  ): Promise<ProductSyncResult> {
    // Use manual sync approach since we don't have the RPC function yet
    return await this.manualSyncUpdate(storeId, recipeId, updates);
  },

  // Manual sync fallback
  async manualSyncUpdate(
    storeId: string,
    recipeId: string,
    updates: UnifiedProductUpdate
  ): Promise<ProductSyncResult> {
    const conflicts: string[] = [];
    const affectedTables: string[] = [];

    try {
      // Start transaction-like behavior by updating both tables
      const catalogUpdate = supabase
        .from('product_catalog')
        .update({
          product_name: updates.productName,
          description: updates.description,
          price: updates.price,
          image_url: updates.imageUrl,
          is_available: updates.isAvailable,
          category_id: updates.categoryId,
          updated_at: new Date().toISOString()
        })
        .eq('store_id', storeId)
        .eq('recipe_id', recipeId);

      const productsUpdate = supabase
        .from('products')
        .update({
          name: updates.productName,
          description: updates.description,
          price: updates.price,
          image_url: updates.imageUrl,
          is_active: updates.isAvailable,
          category_id: updates.categoryId,
          updated_at: new Date().toISOString()
        })
        .eq('store_id', storeId)
        .eq('recipe_id', recipeId);

      // Execute both updates
      const [catalogResult, productsResult] = await Promise.all([
        catalogUpdate,
        productsUpdate
      ]);

      if (catalogResult.error) {
        conflicts.push(`Product catalog update failed: ${catalogResult.error.message}`);
      } else {
        affectedTables.push('product_catalog');
      }

      if (productsResult.error) {
        conflicts.push(`Products table update failed: ${productsResult.error.message}`);
      } else {
        affectedTables.push('products');
      }

      const success = conflicts.length === 0;
      
      if (success) {
        toast.success('Product updated successfully');
      } else {
        toast.error('Some updates failed - check conflicts');
      }

      return {
        success,
        message: success ? 'Product updated successfully' : 'Partial update completed',
        affectedTables,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };
    } catch (error) {
      console.error('Manual sync update failed:', error);
      return {
        success: false,
        message: 'Failed to update product',
        affectedTables: [],
        conflicts: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  },

  // Validate sync status between tables
  async validateSync(storeId: string, recipeId?: string): Promise<{
    isInSync: boolean;
    mismatches: Array<{
      field: string;
      catalogValue: any;
      productsValue: any;
    }>;
  }> {
    try {
      // Get product catalog data
      let catalogQuery = supabase
        .from('product_catalog')
        .select('*')
        .eq('store_id', storeId);

      if (recipeId) {
        catalogQuery = catalogQuery.eq('recipe_id', recipeId);
      }

      const { data: catalogData, error: catalogError } = await catalogQuery;
      if (catalogError) throw catalogError;

      // Get products data
      let productsQuery = supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId);

      if (recipeId) {
        productsQuery = productsQuery.eq('recipe_id', recipeId);
      }

      const { data: productsData, error: productsError } = await productsQuery;
      if (productsError) throw productsError;

      const mismatches: Array<{ field: string; catalogValue: any; productsValue: any }> = [];

      catalogData?.forEach((catalog) => {
        const product = productsData?.find(p => p.recipe_id === catalog.recipe_id);
        if (!product) return;

        // Check for mismatches
        if (catalog.product_name !== product.name) {
          mismatches.push({
            field: 'name',
            catalogValue: catalog.product_name,
            productsValue: product.name
          });
        }

        if (catalog.price !== product.price) {
          mismatches.push({
            field: 'price',
            catalogValue: catalog.price,
            productsValue: product.price
          });
        }

        if (catalog.is_available !== product.is_active) {
          mismatches.push({
            field: 'availability',
            catalogValue: catalog.is_available,
            productsValue: product.is_active
          });
        }
      });

      return {
        isInSync: mismatches.length === 0,
        mismatches
      };
    } catch (error) {
      console.error('Sync validation failed:', error);
      return {
        isInSync: false,
        mismatches: []
      };
    }
  },

  // Repair sync issues
  async repairSync(storeId: string, recipeId?: string): Promise<ProductSyncResult> {
    try {
      const validation = await this.validateSync(storeId, recipeId);
      
      if (validation.isInSync) {
        return {
          success: true,
          message: 'No sync issues found',
          affectedTables: []
        };
      }

      // Use product_catalog as source of truth for repair
      const { data: catalogItems, error } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('store_id', storeId)
        .match(recipeId ? { recipe_id: recipeId } : {});

      if (error) throw error;

      const repairs = catalogItems?.map(async (catalog) => {
        if (catalog.recipe_id) {
          const { error } = await supabase
            .from('products')
            .update({
              name: catalog.product_name,
              description: catalog.description,
              price: catalog.price,
              image_url: catalog.image_url,
              is_active: catalog.is_available,
              category_id: catalog.category_id,
              updated_at: new Date().toISOString()
            })
            .eq('store_id', storeId)
            .eq('recipe_id', catalog.recipe_id);
          
          if (error) throw error;
          return true;
        }
        return false;
      }) || [];

      const results = await Promise.all(repairs);
      const repairCount = results.filter(Boolean).length;

      toast.success('Sync issues repaired successfully');

      return {
        success: true,
        message: `Repaired ${repairCount} sync issues`,
        affectedTables: ['products']
      };
    } catch (error) {
      console.error('Sync repair failed:', error);
      toast.error('Failed to repair sync issues');
      
      return {
        success: false,
        message: 'Failed to repair sync issues',
        affectedTables: [],
        conflicts: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
};