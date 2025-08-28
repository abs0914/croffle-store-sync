/**
 * Constraint Violation Handler for Product Catalog Updates
 * 
 * This service handles the "products_store_id_sku_key" constraint violation
 * that occurs when updating products in the Product Catalog system.
 */

import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface ConstraintViolationError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

interface ProductCatalogUpdate {
  id: string;
  product_name?: string;
  description?: string;
  price?: number;
  is_available?: boolean;
  image_url?: string;
  category_id?: string;
  recipe_id?: string;
}

export class ConstraintViolationHandler {
  /**
   * Safely update a product catalog entry with constraint violation handling
   */
  static async safeUpdateProductCatalog(
    id: string, 
    updates: Partial<ProductCatalogUpdate>
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log('🔄 Attempting safe product catalog update:', { id, updates });

      // First, try the normal update
      const { data, error } = await supabase
        .from('product_catalog')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (!error) {
        console.log('✅ Product catalog update successful');
        return { success: true, data };
      }

      // Check if it's the specific constraint violation we're handling
      if (this.isConstraintViolationError(error)) {
        console.log('⚠️ Constraint violation detected, attempting recovery...');
        return await this.handleConstraintViolation(id, updates, error);
      }

      // If it's a different error, throw it
      throw error;

    } catch (error: any) {
      console.error('❌ Product catalog update failed:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      };
    }
  }

  /**
   * Check if the error is the specific constraint violation we're handling
   */
  private static isConstraintViolationError(error: any): boolean {
    return (
      error?.code === '23505' && 
      (
        error?.message?.includes('products_store_id_sku_key') ||
        error?.message?.includes('duplicate key value violates unique constraint')
      )
    );
  }

  /**
   * Handle the constraint violation by cleaning up conflicts and retrying
   */
  private static async handleConstraintViolation(
    catalogId: string,
    updates: Partial<ProductCatalogUpdate>,
    originalError: any
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log('🔧 Starting constraint violation recovery process...');

      // Step 1: Get the current product catalog entry
      const { data: catalogEntry, error: fetchError } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('id', catalogId)
        .single();

      if (fetchError || !catalogEntry) {
        throw new Error('Could not fetch product catalog entry');
      }

      // Step 2: Find conflicting products in the products table
      const conflicts = await this.findConflictingProducts(catalogEntry, updates);
      
      if (conflicts.length > 0) {
        console.log(`🔍 Found ${conflicts.length} conflicting products, resolving...`);
        await this.resolveProductConflicts(conflicts);
      }

      // Step 3: Temporarily disable sync triggers to prevent cascading issues
      await this.temporarilyDisableSyncTriggers();

      // Step 4: Retry the update
      const { data, error: retryError } = await supabase
        .from('product_catalog')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', catalogId)
        .select();

      // Step 5: Re-enable sync triggers
      await this.reEnableSyncTriggers();

      if (retryError) {
        throw retryError;
      }

      console.log('✅ Constraint violation resolved successfully');
      toast.success('Product updated successfully after resolving conflicts');
      
      return { success: true, data };

    } catch (error: any) {
      console.error('❌ Failed to resolve constraint violation:', error);
      
      // Re-enable triggers even if there was an error
      await this.reEnableSyncTriggers().catch(console.error);
      
      toast.error('Failed to update product. Please try again or contact support.');
      
      return { 
        success: false, 
        error: `Constraint violation could not be resolved: ${error.message}` 
      };
    }
  }

  /**
   * Find products that might be causing the constraint violation
   */
  private static async findConflictingProducts(
    catalogEntry: any,
    updates: Partial<ProductCatalogUpdate>
  ): Promise<any[]> {
    const productName = updates.product_name || catalogEntry.product_name;
    const storeId = catalogEntry.store_id;

    // Look for products with the same name in the same store
    const { data: conflictingProducts, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('name', productName);

    if (error) {
      console.error('Error finding conflicting products:', error);
      return [];
    }

    return conflictingProducts || [];
  }

  /**
   * Resolve conflicts by updating SKUs or deactivating duplicates
   */
  private static async resolveProductConflicts(conflicts: any[]): Promise<void> {
    for (const conflict of conflicts) {
      try {
        // Generate a new unique SKU for the conflicting product
        const newSku = await this.generateUniqueSku(conflict.name, conflict.store_id);
        
        await supabase
          .from('products')
          .update({
            sku: newSku,
            updated_at: new Date().toISOString()
          })
          .eq('id', conflict.id);

        console.log(`🔧 Updated conflicting product SKU: ${conflict.name} -> ${newSku}`);
        
      } catch (error) {
        console.error(`Failed to resolve conflict for product ${conflict.id}:`, error);
        
        // As a fallback, deactivate the conflicting product
        await supabase
          .from('products')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', conflict.id);
          
        console.log(`🔧 Deactivated conflicting product: ${conflict.name}`);
      }
    }
  }

  /**
   * Generate a unique SKU for a product
   */
  private static async generateUniqueSku(productName: string, storeId: string): Promise<string> {
    const baseSkuPart = productName
      .replace(/[^A-Za-z0-9]/g, '')
      .substring(0, 10)
      .toUpperCase();
    
    const storeIdPart = storeId.substring(0, 6).toUpperCase();
    const timestamp = Date.now().toString().substring(-6);
    
    return `PC-${baseSkuPart}-${storeIdPart}-${timestamp}`;
  }

  /**
   * Temporarily disable sync triggers to prevent cascading issues
   */
  private static async temporarilyDisableSyncTriggers(): Promise<void> {
    try {
      await supabase.rpc('disable_sync_triggers');
    } catch (error) {
      console.warn('Could not disable sync triggers:', error);
      // Continue anyway - this is not critical
    }
  }

  /**
   * Re-enable sync triggers
   */
  private static async reEnableSyncTriggers(): Promise<void> {
    try {
      await supabase.rpc('enable_sync_triggers');
    } catch (error) {
      console.warn('Could not re-enable sync triggers:', error);
      // This is more serious - log it prominently
    }
  }

  /**
   * Utility method to check if a product catalog update is safe
   */
  static async validateUpdateSafety(
    id: string, 
    updates: Partial<ProductCatalogUpdate>
  ): Promise<{ safe: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Get current catalog entry
      const { data: catalogEntry } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('id', id)
        .single();

      if (!catalogEntry) {
        issues.push('Product catalog entry not found');
        return { safe: false, issues };
      }

      // Check for potential name conflicts
      if (updates.product_name && updates.product_name !== catalogEntry.product_name) {
        const { data: existingProducts } = await supabase
          .from('products')
          .select('id, name, sku')
          .eq('store_id', catalogEntry.store_id)
          .eq('name', updates.product_name)
          .eq('is_active', true);

        if (existingProducts && existingProducts.length > 0) {
          issues.push(`Product name "${updates.product_name}" already exists in this store`);
        }
      }

      return { safe: issues.length === 0, issues };

    } catch (error) {
      issues.push(`Validation error: ${error}`);
      return { safe: false, issues };
    }
  }
}

/**
 * Enhanced product catalog service with constraint violation handling
 */
export const enhancedProductCatalogService = {
  /**
   * Update a product with automatic constraint violation handling
   */
  async updateProduct(id: string, updates: Partial<ProductCatalogUpdate>) {
    return await ConstraintViolationHandler.safeUpdateProductCatalog(id, updates);
  },

  /**
   * Validate if an update is safe before attempting it
   */
  async validateUpdate(id: string, updates: Partial<ProductCatalogUpdate>) {
    return await ConstraintViolationHandler.validateUpdateSafety(id, updates);
  }
};
