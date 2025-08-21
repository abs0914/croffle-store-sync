import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductValidationResult {
  isValid: boolean;
  canSell: boolean;
  missingIngredients: string[];
  insufficientIngredients: Array<{
    item: string;
    required: number;
    available: number;
  }>;
  maxQuantityAvailable: number;
  validationDetails: {
    hasRecipe: boolean;
    ingredientsCount: number;
    inventoryItemsFound: number;
  };
}

/**
 * Intelligent Inventory Validation Service
 * Ensures products are only available when all required ingredients are in stock
 */
export class IntelligentValidationService {
  
  /**
   * Comprehensive product validation before POS display
   */
  static async validateProductForPOS(productId: string): Promise<ProductValidationResult> {
    try {
      console.log('🔍 Validating product for POS:', productId);
      
      // Get product and recipe information
      const { data: product, error: productError } = await supabase
        .from('product_catalog')
        .select(`
          *,
          recipes!inner(
            id,
            is_active,
            recipe_ingredients(
              quantity,
              unit,
              inventory_stock_id,
              inventory_stock!inner(
                item,
                unit,
                stock_quantity,
                is_active
              )
            )
          )
        `)
        .eq('id', productId)
        .single();
        
      if (productError || !product) {
        return this.createFailedValidation('Product not found', [], []);
      }
      
      // Check if product has an active recipe
      if (!product.recipes || !product.recipes.is_active) {
        return this.createFailedValidation('No active recipe found', [], []);
      }
      
      const ingredients = product.recipes.recipe_ingredients || [];
      
      if (ingredients.length === 0) {
        return this.createFailedValidation('Recipe has no ingredients', [], []);
      }
      
      // Validate each ingredient
      const missingIngredients: string[] = [];
      const insufficientIngredients: Array<{ item: string; required: number; available: number }> = [];
      let maxQuantityAvailable = Infinity;
      let inventoryItemsFound = 0;
      
      for (const ingredient of ingredients) {
        const inventoryItem = ingredient.inventory_stock;
        
        if (!inventoryItem || !inventoryItem.is_active) {
          missingIngredients.push(ingredient.inventory_stock?.item || 'Unknown ingredient');
          continue;
        }
        
        inventoryItemsFound++;
        
        const requiredQuantity = ingredient.quantity;
        const availableStock = inventoryItem.stock_quantity || 0;
        
        // Calculate how many products can be made with this ingredient
        const maxFromThisIngredient = Math.floor(availableStock / requiredQuantity);
        maxQuantityAvailable = Math.min(maxQuantityAvailable, maxFromThisIngredient);
        
        // Check if we have insufficient stock
        if (availableStock < requiredQuantity) {
          insufficientIngredients.push({
            item: inventoryItem.item,
            required: requiredQuantity,
            available: availableStock
          });
        }
      }
      
      // Reset max quantity if infinite
      if (maxQuantityAvailable === Infinity) {
        maxQuantityAvailable = 0;
      }
      
      const isValid = missingIngredients.length === 0 && insufficientIngredients.length === 0;
      const canSell = isValid && maxQuantityAvailable > 0;
      
      return {
        isValid,
        canSell,
        missingIngredients,
        insufficientIngredients,
        maxQuantityAvailable,
        validationDetails: {
          hasRecipe: true,
          ingredientsCount: ingredients.length,
          inventoryItemsFound
        }
      };
    } catch (error) {
      console.error('❌ Product validation failed:', error);
      return this.createFailedValidation('Validation error occurred', [], []);
    }
  }
  
  /**
   * Batch validate multiple products for POS display
   */
  static async batchValidateProducts(productIds: string[]): Promise<Map<string, ProductValidationResult>> {
    const results = new Map<string, ProductValidationResult>();
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (productId) => {
        const result = await this.validateProductForPOS(productId);
        return [productId, result] as [string, ProductValidationResult];
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(([productId, result]) => {
        results.set(productId, result);
      });
    }
    
    return results;
  }
  
  /**
   * Get all sellable products for a store
   */
  static async getSellableProducts(storeId: string): Promise<{
    sellable: any[];
    unavailable: any[];
    validationSummary: {
      total: number;
      sellable: number;
      missingRecipes: number;
      insufficientStock: number;
      missingIngredients: number;
    };
  }> {
    try {
      console.log('📋 Getting sellable products for store:', storeId);
      
      // Get all active products for the store
      const { data: products, error } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_available', true);
        
      if (error) throw error;
      
      if (!products || products.length === 0) {
        return {
          sellable: [],
          unavailable: [],
          validationSummary: {
            total: 0,
            sellable: 0,
            missingRecipes: 0,
            insufficientStock: 0,
            missingIngredients: 0
          }
        };
      }
      
      // Validate each product
      const productIds = products.map(p => p.id);
      const validationResults = await this.batchValidateProducts(productIds);
      
      const sellable: any[] = [];
      const unavailable: any[] = [];
      let missingRecipes = 0;
      let insufficientStock = 0;
      let missingIngredients = 0;
      
      products.forEach(product => {
        const validation = validationResults.get(product.id);
        
        if (!validation) {
          unavailable.push({ ...product, reason: 'Validation failed' });
          return;
        }
        
        if (validation.canSell) {
          sellable.push({
            ...product,
            maxQuantityAvailable: validation.maxQuantityAvailable
          });
        } else {
          let reason = 'Unknown issue';
          
          if (!validation.validationDetails.hasRecipe) {
            reason = 'No recipe found';
            missingRecipes++;
          } else if (validation.missingIngredients.length > 0) {
            reason = `Missing ingredients: ${validation.missingIngredients.join(', ')}`;
            missingIngredients++;
          } else if (validation.insufficientIngredients.length > 0) {
            reason = `Insufficient stock: ${validation.insufficientIngredients.map(i => i.item).join(', ')}`;
            insufficientStock++;
          }
          
          unavailable.push({ ...product, reason, validation });
        }
      });
      
      return {
        sellable,
        unavailable,
        validationSummary: {
          total: products.length,
          sellable: sellable.length,
          missingRecipes,
          insufficientStock,
          missingIngredients
        }
      };
    } catch (error) {
      console.error('❌ Failed to get sellable products:', error);
      return {
        sellable: [],
        unavailable: [],
        validationSummary: {
          total: 0,
          sellable: 0,
          missingRecipes: 0,
          insufficientStock: 0,
          missingIngredients: 0
        }
      };
    }
  }
  
  /**
   * Auto-repair missing inventory items for a store
   */
  static async autoRepairMissingInventory(storeId: string): Promise<{
    created: number;
    failed: number;
    details: Array<{ item: string; success: boolean; reason?: string }>;
  }> {
    try {
      console.log('🔧 Auto-repairing missing inventory for store:', storeId);
      
      // Get products with missing inventory items
      const { sellable, unavailable } = await this.getSellableProducts(storeId);
      
      const repairDetails: Array<{ item: string; success: boolean; reason?: string }> = [];
      let created = 0;
      let failed = 0;
      
      // Find products with missing ingredients
      const productsWithMissingIngredients = unavailable.filter(p => 
        p.validation?.missingIngredients?.length > 0
      );
      
      for (const product of productsWithMissingIngredients) {
        for (const missingItem of product.validation.missingIngredients) {
          try {
            // Try to find the item in commissary to get proper details
            const { data: commissaryItem } = await supabase
              .from('commissary_inventory')
              .select('*')
              .ilike('name', `%${missingItem}%`)
              .single();
            
            const { error: createError } = await supabase
              .from('inventory_stock')
              .insert({
                store_id: storeId,
                item: missingItem,
                unit: commissaryItem?.unit || 'pieces',
                stock_quantity: 0,
                cost: commissaryItem?.unit_cost || 0,
                is_active: true,
                minimum_threshold: 10
              });
              
            if (createError) {
              repairDetails.push({
                item: missingItem,
                success: false,
                reason: createError.message
              });
              failed++;
            } else {
              repairDetails.push({
                item: missingItem,
                success: true
              });
              created++;
            }
          } catch (error) {
            repairDetails.push({
              item: missingItem,
              success: false,
              reason: 'Failed to create inventory item'
            });
            failed++;
          }
        }
      }
      
      console.log(`✅ Auto-repair completed: ${created} created, ${failed} failed`);
      
      return {
        created,
        failed,
        details: repairDetails
      };
    } catch (error) {
      console.error('❌ Auto-repair failed:', error);
      return {
        created: 0,
        failed: 0,
        details: []
      };
    }
  }
  
  /**
   * Helper to create failed validation result
   */
  private static createFailedValidation(
    reason: string,
    missingIngredients: string[],
    insufficientIngredients: Array<{ item: string; required: number; available: number }>
  ): ProductValidationResult {
    return {
      isValid: false,
      canSell: false,
      missingIngredients,
      insufficientIngredients,
      maxQuantityAvailable: 0,
      validationDetails: {
        hasRecipe: false,
        ingredientsCount: 0,
        inventoryItemsFound: 0
      }
    };
  }
}