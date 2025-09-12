import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductCatalogConsistencyReport {
  zeroPriceItems: number;
  missingRecipes: number;
  syncMismatches: number;
  missingCategories: number;
  totalIssues: number;
}

export interface InventoryValidationResult {
  isAvailable: boolean;
  missingIngredients: string[];
  insufficientStock: string[];
}

/**
 * Enhanced Product Catalog Service with improved business logic
 */
export class EnhancedProductCatalogService {
  
  /**
   * Validate product catalog consistency and return detailed report
   */
  static async validateConsistency(): Promise<ProductCatalogConsistencyReport> {
    try {
      const { data: issues, error } = await supabase
        .rpc('validate_product_catalog_consistency');

      if (error) {
        console.error('Error validating catalog consistency:', error);
        throw error;
      }

      const report: ProductCatalogConsistencyReport = {
        zeroPriceItems: 0,
        missingRecipes: 0,
        syncMismatches: 0,
        missingCategories: 0,
        totalIssues: 0
      };

      issues?.forEach((issue: any) => {
        switch (issue.issue_type) {
          case 'zero_price':
            report.zeroPriceItems = issue.count_affected;
            break;
          case 'missing_recipe':
            report.missingRecipes = issue.count_affected;
            break;
          case 'sync_mismatch':
            report.syncMismatches = issue.count_affected;
            break;
          case 'missing_category':
            report.missingCategories = issue.count_affected;
            break;
        }
      });

      report.totalIssues = report.zeroPriceItems + report.missingRecipes + 
                          report.syncMismatches + report.missingCategories;

      return report;
    } catch (error) {
      console.error('Validation failed:', error);
      throw new Error('Failed to validate product catalog consistency');
    }
  }

  /**
   * Check product availability including ingredient stock validation
   */
  static async validateProductAvailability(
    productCatalogId: string, 
    quantity: number = 1
  ): Promise<InventoryValidationResult> {
    try {
      const { data: validation, error } = await supabase
        .rpc('validate_product_ingredients_availability', {
          product_id: productCatalogId,
          quantity: quantity
        });

      if (error) {
        console.error('Error validating product availability:', error);
        throw error;
      }

      const result = validation?.[0];
      return {
        isAvailable: result?.is_available || false,
        missingIngredients: result?.missing_ingredients || [],
        insufficientStock: result?.insufficient_stock || []
      };
    } catch (error) {
      console.error('Availability validation failed:', error);
      return {
        isAvailable: false,
        missingIngredients: ['Validation failed'],
        insufficientStock: []
      };
    }
  }

  /**
   * Update product with comprehensive validation and sync
   */
  static async updateProductWithValidation(
    id: string, 
    updates: any
  ): Promise<boolean> {
    try {
      // Validate availability if being set to true
      if (updates.is_available === true) {
        const validation = await this.validateProductAvailability(id);
        if (!validation.isAvailable) {
          toast.error(`Cannot enable product: ${validation.missingIngredients.join(', ')}`);
          return false;
        }
      }

      const { error } = await supabase
        .from('product_catalog')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating product:', error);
        toast.error('Failed to update product');
        return false;
      }

      // Broadcast cache invalidation
      await supabase.channel('product_catalog_changes').send({
        type: 'broadcast',
        event: 'product_catalog_changed',
        payload: { productId: id, eventType: 'UPDATE' }
      });

      toast.success('Product updated successfully');
      return true;
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update product');
      return false;
    }
  }

  /**
   * Fetch products with enhanced filtering and availability checking
   */
  static async fetchProductsWithAvailability(storeId: string) {
    try {
      const { data: products, error } = await supabase
        .from('product_catalog')
        .select(`
          *,
          categories:category_id(id, name),
          recipes:recipe_id(id, name, total_cost),
          product_ingredients(
            id,
            required_quantity,
            unit,
            inventory_stock:inventory_stock!recipe_ingredients_inventory_stock_id_fkey(
              id,
              item,
              stock_quantity,
              is_active
            )
          )
        `)
        .eq('store_id', storeId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      // Enhance products with real-time availability status
      const enhancedProducts = await Promise.all(
        (products || []).map(async (product) => {
          if (product.is_available && product.product_ingredients?.length > 0) {
            const validation = await this.validateProductAvailability(product.id);
            return {
              ...product,
              actuallyAvailable: validation.isAvailable,
              availabilityReason: validation.isAvailable ? 
                'Available' : 
                `Unavailable: ${validation.insufficientStock.join(', ')}`
            };
          }
          return {
            ...product,
            actuallyAvailable: product.is_available,
            availabilityReason: product.is_available ? 'Available' : 'Disabled'
          };
        })
      );

      return enhancedProducts;
    } catch (error) {
      console.error('Failed to fetch products with availability:', error);
      throw error;
    }
  }

  /**
   * Create product with comprehensive validation
   */
  static async createProductWithValidation(productData: any, ingredients: any[] = []) {
    try {
      // Create the product first
      const { data: product, error: productError } = await supabase
        .from('product_catalog')
        .insert({
          ...productData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (productError) {
        console.error('Error creating product:', productError);
        throw productError;
      }

      // Add ingredients if provided
      if (ingredients.length > 0) {
        const ingredientsWithProductId = ingredients.map(ing => ({
          ...ing,
          product_catalog_id: product.id
        }));

        const { error: ingredientsError } = await supabase
          .from('product_ingredients')
          .insert(ingredientsWithProductId);

        if (ingredientsError) {
          console.error('Error adding ingredients:', ingredientsError);
          // Don't fail the whole operation, just warn
          toast.warning('Product created but some ingredients failed to add');
        }
      }

      // Broadcast cache invalidation
      await supabase.channel('product_catalog_changes').send({
        type: 'broadcast',
        event: 'product_catalog_changed',
        payload: { productId: product.id, eventType: 'INSERT' }
      });

      toast.success('Product created successfully');
      return product;
    } catch (error) {
      console.error('Product creation failed:', error);
      toast.error('Failed to create product');
      return null;
    }
  }

  /**
   * Sync all products between catalog and products table
   */
  static async syncCatalogWithProducts(storeId: string): Promise<{
    synced: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      // Get all catalog items that need syncing
      const { data: catalogItems, error } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('store_id', storeId);

      if (error) throw error;

      for (const item of catalogItems || []) {
        try {
          // Check if corresponding product exists
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('store_id', item.store_id)
            .eq('name', item.product_name)
            .single();

          if (existingProduct) {
            // Update existing product
            await supabase
              .from('products')
              .update({
                description: item.description,
                price: item.price,
                image_url: item.image_url,
                is_active: item.is_available,
                category_id: item.category_id,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProduct.id);
          } else {
            // Create new product
            await supabase
              .from('products')
              .insert({
                name: item.product_name,
                description: item.description,
                price: item.price,
                cost: item.price * 0.7,
                sku: `PC-${item.id.substring(0, 8)}`,
                stock_quantity: 100,
                category_id: item.category_id,
                store_id: item.store_id,
                is_active: item.is_available,
                recipe_id: item.recipe_id,
                product_type: item.recipe_id ? 'recipe' : 'direct',
                image_url: item.image_url
              });
          }
          synced++;
        } catch (itemError) {
          console.error(`Error syncing item ${item.product_name}:`, itemError);
          errors.push(`${item.product_name}: ${itemError}`);
        }
      }

      if (synced > 0) {
        toast.success(`Synced ${synced} products successfully`);
      }
      if (errors.length > 0) {
        toast.warning(`${errors.length} items had sync errors`);
      }

      return { synced, errors };
    } catch (error) {
      console.error('Sync operation failed:', error);
      throw error;
    }
  }
}