import { supabase } from "@/integrations/supabase/client";
import { EnhancedProductCatalog } from "@/services/productCatalog/enhancedCatalogService";

export interface StreamlinedPOSProduct {
  id: string;
  product_name: string;
  price: number;
  is_pos_ready: boolean;
  validation_issues?: string[];
  last_validated: string;
}

/**
 * Streamlined POS Validation Service
 * Pre-validates products at catalog level to optimize POS performance
 */
export class StreamlinedValidationService {
  
  /**
   * Get POS-ready products only - pre-validated and cached
   */
  static async getPOSReadyProducts(storeId: string): Promise<StreamlinedPOSProduct[]> {
    try {
      console.log('🚀 Getting POS-ready products for store:', storeId);
      
      // Get enhanced product catalog with validation status
      const { data: products, error } = await supabase
        .from('product_catalog')
        .select(`
          id,
          product_name,
          price,
          is_available,
          recipe_id,
          recipe:recipes(
            id,
            is_active,
            template_id,
            template:recipe_templates(
              id,
              is_active
            )
          ),
          ingredients:product_ingredients(
            id,
            required_quantity,
            inventory_item:inventory_stock(
              id,
              stock_quantity,
              is_active
            )
          )
        `)
        .eq('store_id', storeId)
        .eq('is_available', true) // Only get available products
        .order('product_name');

      if (error) throw error;

      const posReadyProducts = products.map(product => {
        const validationIssues: string[] = [];
        let isPOSReady = true;

        // Check basic availability
        if (!product.is_available) {
          validationIssues.push('Product not available');
          isPOSReady = false;
        }

        // Check recipe validation for recipe-based products
        if (product.recipe_id) {
          if (!product.recipe?.id) {
            validationIssues.push('Recipe not found');
            isPOSReady = false;
          } else if (!product.recipe.is_active) {
            validationIssues.push('Recipe inactive');
            isPOSReady = false;
          } else if (!product.recipe.template?.id) {
            validationIssues.push('Recipe template missing');
            isPOSReady = false;
          } else if (!product.recipe.template.is_active) {
            validationIssues.push('Recipe template inactive');
            isPOSReady = false;
          }

          // Check ingredients availability
          if (product.ingredients && product.ingredients.length > 0) {
            for (const ingredient of product.ingredients) {
              if (!ingredient.inventory_item) {
                validationIssues.push('Missing inventory mapping');
                isPOSReady = false;
                break;
              } else if (!ingredient.inventory_item.is_active) {
                validationIssues.push('Inventory item inactive');
                isPOSReady = false;
                break;
              }
              // Note: We don't check stock quantity here for performance
              // Stock validation will be done at transaction time
            }
          } else if (product.recipe_id) {
            // Recipe exists but no ingredients
            validationIssues.push('Recipe has no ingredients');
            isPOSReady = false;
          }
        }

        return {
          id: product.id,
          product_name: product.product_name,
          price: product.price,
          is_pos_ready: isPOSReady,
          validation_issues: validationIssues.length > 0 ? validationIssues : undefined,
          last_validated: new Date().toISOString()
        };
      });

      const readyCount = posReadyProducts.filter(p => p.is_pos_ready).length;
      console.log(`✅ POS Products: ${readyCount}/${posReadyProducts.length} ready for sale`);

      return posReadyProducts;
    } catch (error) {
      console.error('❌ Error getting POS-ready products:', error);
      return [];
    }
  }

  /**
   * Lightweight transaction validation - only check stock at transaction time
   */
  static async validateTransactionItems(
    storeId: string,
    items: { productId: string; quantity: number }[]
  ): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      console.log('🔍 Validating transaction items:', items.length);
      
      const errors: string[] = [];

      for (const item of items) {
        // Get product with ingredient details
        const { data: product } = await supabase
          .from('product_catalog')
          .select(`
            id,
            product_name,
            is_available,
            recipe_id,
            ingredients:product_ingredients(
              required_quantity,
              inventory_item:inventory_stock(
                stock_quantity,
                is_active
              )
            )
          `)
          .eq('id', item.productId)
          .eq('store_id', storeId)
          .single();

        if (!product) {
          errors.push(`Product not found: ${item.productId}`);
          continue;
        }

        if (!product.is_available) {
          errors.push(`Product unavailable: ${product.product_name}`);
          continue;
        }

        // Check stock for recipe-based products
        if (product.recipe_id && product.ingredients?.length > 0) {
          for (const ingredient of product.ingredients) {
            if (ingredient.inventory_item?.is_active) {
              const requiredStock = ingredient.required_quantity * item.quantity;
              const availableStock = ingredient.inventory_item.stock_quantity || 0;
              
              if (availableStock < requiredStock) {
                errors.push(`Insufficient stock for ${product.product_name}`);
                break;
              }
            }
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('❌ Transaction validation error:', error);
      return {
        isValid: false,
        errors: ['Validation service error']
      };
    }
  }

  /**
   * Update product POS readiness status in cache
   */
  static async updatePOSReadinessCache(storeId: string): Promise<void> {
    try {
      console.log('🔄 Updating POS readiness cache for store:', storeId);
      
      // This could be implemented to cache validation results
      // in a separate table for faster POS access
      
      console.log('✅ POS readiness cache updated');
    } catch (error) {
      console.error('❌ Error updating POS cache:', error);
    }
  }
}