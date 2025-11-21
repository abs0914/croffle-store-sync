import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingProducts: Array<{ productId: string; productName: string }>;
  invalidProducts: Array<{ productId: string; productName: string; reason: string }>;
}

export interface PreTransactionCheck {
  canProceed: boolean;
  blockers: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Enhanced Transaction Validation Service
 * Provides comprehensive validation before transaction processing
 */
export class TransactionValidationService {

  /**
   * Validate product existence and availability before transaction
   */
  static async validateProductsForTransaction(
    items: Array<{ productId: string; productName: string; quantity: number }>,
    storeId: string
  ): Promise<ValidationResult> {
    // Check if we're offline
    const isOffline = !navigator.onLine;
    
    // If offline, skip validation (assume valid)
    if (isOffline) {
      console.log('🔌 Offline mode: Skipping product validation');
      return {
        isValid: true,
        errors: [],
        warnings: ['Operating in offline mode - validation will occur when online'],
        missingProducts: [],
        invalidProducts: []
      };
    }
    
    try {
      console.log('🔍 Validating products for transaction:', { items: items.length, storeId });
      
      const errors: string[] = [];
      const warnings: string[] = [];
      const missingProducts: Array<{ productId: string; productName: string }> = [];
      const invalidProducts: Array<{ productId: string; productName: string; reason: string }> = [];

      // Check if products exist in both product_catalog and products tables
      for (const item of items) {
        // Check product_catalog existence
        const { data: catalogProduct, error: catalogError } = await supabase
          .from('product_catalog')
          .select('id, product_name, is_available, recipe_id')
          .eq('id', item.productId)
          .eq('store_id', storeId)
          .maybeSingle();

        if (catalogError) {
          errors.push(`Error checking catalog for ${item.productName}: ${catalogError.message}`);
          continue;
        }

        if (!catalogProduct) {
          missingProducts.push({ productId: item.productId, productName: item.productName });
          errors.push(`Product not found in catalog: ${item.productName}`);
          continue;
        }

        if (!catalogProduct.is_available) {
          invalidProducts.push({ 
            productId: item.productId, 
            productName: item.productName, 
            reason: 'Product is not available' 
          });
          errors.push(`Product unavailable: ${item.productName}`);
          continue;
        }

        // Check products table existence
        const { data: productRecord, error: productError } = await supabase
          .from('products')
          .select('id, name, is_active')
          .eq('id', item.productId)
          .eq('store_id', storeId)
          .maybeSingle();

        if (productError) {
          errors.push(`Error checking products table for ${item.productName}: ${productError.message}`);
          continue;
        }

        if (!productRecord) {
          missingProducts.push({ productId: item.productId, productName: item.productName });
          warnings.push(`Product exists in catalog but missing from products table: ${item.productName}`);
        } else if (!productRecord.is_active) {
          invalidProducts.push({ 
            productId: item.productId, 
            productName: item.productName, 
            reason: 'Product is inactive in products table' 
          });
          warnings.push(`Product inactive in products table: ${item.productName}`);
        }

        // Check ingredient availability
        const ingredientValidation = await this.validateIngredientAvailability(item.productId, item.quantity);
        if (!ingredientValidation.isValid) {
          errors.push(...ingredientValidation.errors);
        }
        warnings.push(...ingredientValidation.warnings);
      }

      const isValid = errors.length === 0 && missingProducts.length === 0;

      return {
        isValid,
        errors,
        warnings,
        missingProducts,
        invalidProducts
      };
    } catch (error) {
      console.error('❌ Product validation failed:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation system error'],
        warnings: [],
        missingProducts: [],
        invalidProducts: []
      };
    }
  }

  /**
   * Check ingredient availability for a product
   */
  private static async validateIngredientAvailability(
    productId: string, 
    quantity: number
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Get product ingredients
      const { data: ingredients, error } = await supabase
        .from('product_ingredients')
        .select(`
          required_quantity,
          unit,
          inventory_stock:inventory_stock(
            item,
            stock_quantity,
            minimum_threshold
          )
        `)
        .eq('product_catalog_id', productId);

      if (error) {
        errors.push(`Error fetching ingredients: ${error.message}`);
        return { isValid: false, errors, warnings };
      }

      if (!ingredients || ingredients.length === 0) {
        warnings.push('No ingredients configured for this product');
        return { isValid: true, errors, warnings };
      }

      // Check each ingredient
      for (const ingredient of ingredients) {
        const requiredAmount = ingredient.required_quantity * quantity;
        const availableStock = ingredient.inventory_stock?.stock_quantity || 0;
        const itemName = ingredient.inventory_stock?.item || 'Unknown item';

        if (availableStock < requiredAmount) {
          errors.push(`Insufficient ${itemName}: need ${requiredAmount}, have ${availableStock}`);
        } else {
          const remainingAfterSale = availableStock - requiredAmount;
          const threshold = ingredient.inventory_stock?.minimum_threshold || 10;
          
          if (remainingAfterSale < threshold) {
            warnings.push(`Low stock warning for ${itemName}: ${remainingAfterSale} will remain (below threshold of ${threshold})`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('❌ Ingredient validation failed:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Ingredient validation error'],
        warnings: []
      };
    }
  }

  /**
   * Comprehensive pre-transaction check
   */
  static async performPreTransactionCheck(
    items: Array<{ productId: string; productName: string; quantity: number }>,
    storeId: string
  ): Promise<PreTransactionCheck> {
    // Check if we're offline
    const isOffline = !navigator.onLine;
    
    // If offline, allow transaction to proceed
    if (isOffline) {
      console.log('🔌 Offline mode: Bypassing pre-transaction check');
      return {
        canProceed: true,
        blockers: [],
        warnings: ['Operating in offline mode - full validation will occur when online'],
        recommendations: []
      };
    }
    
    try {
      console.log('🔍 Performing pre-transaction check...');
      
      const blockers: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Validate products
      const productValidation = await this.validateProductsForTransaction(items, storeId);
      
      // Critical blockers
      if (productValidation.missingProducts.length > 0) {
        blockers.push(`Missing products: ${productValidation.missingProducts.map(p => p.productName).join(', ')}`);
        recommendations.push('Deploy missing products using the product deployment function');
      }

      if (productValidation.errors.length > 0) {
        blockers.push(...productValidation.errors);
      }

      // Warnings
      warnings.push(...productValidation.warnings);

      // Store readiness check
      const storeReadiness = await this.checkStoreReadiness(storeId);
      if (!storeReadiness.isReady) {
        blockers.push(...storeReadiness.issues);
        recommendations.push(...storeReadiness.recommendations);
      }

      const canProceed = blockers.length === 0;

      if (!canProceed) {
        console.warn('🚨 Transaction blocked by validation issues:', blockers);
        toast.error(`Transaction cannot proceed: ${blockers[0]}`);
      } else if (warnings.length > 0) {
        console.warn('⚠️ Transaction has warnings:', warnings);
        toast.warning(`Transaction warnings: ${warnings[0]}`);
      }

      return {
        canProceed,
        blockers,
        warnings,
        recommendations
      };
    } catch (error) {
      console.error('❌ Pre-transaction check failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Check failed';
      
      return {
        canProceed: false,
        blockers: [errorMsg],
        warnings: [],
        recommendations: ['Contact system administrator']
      };
    }
  }

  /**
   * Check if store is ready for transactions (has proper data synchronization)
   */
  private static async checkStoreReadiness(storeId: string): Promise<{
    isReady: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check if store has active inventory
      const { data: inventoryCount, error: inventoryError } = await supabase
        .from('inventory_stock')
        .select('id', { count: 'exact' })
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (inventoryError) {
        issues.push('Cannot verify inventory status');
        return { isReady: false, issues, recommendations };
      }

      if ((inventoryCount?.length || 0) === 0) {
        issues.push('Store has no active inventory items');
        recommendations.push('Set up inventory for this store before processing sales');
      }

      // Check product synchronization
      const { data: syncCheck } = await supabase
        .from('product_catalog')
        .select(`
          id,
          product_name,
          products!inner(id)
        `)
        .eq('store_id', storeId)
        .eq('is_available', true);

      const catalogCount = syncCheck?.length || 0;
      const productCount = syncCheck?.filter(item => item.products && item.products.length > 0).length || 0;

      if (catalogCount > productCount) {
        const missingCount = catalogCount - productCount;
        issues.push(`${missingCount} products in catalog are missing from products table`);
        recommendations.push('Run product deployment to sync catalog with products table');
      }

      return {
        isReady: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      console.error('❌ Store readiness check failed:', error);
      return {
        isReady: false,
        issues: ['Store readiness check failed'],
        recommendations: ['Contact system administrator']
      };
    }
  }

  /**
   * Enhanced transaction validation with automatic fixes
   */
  static async validateAndFixTransaction(
    items: Array<{ productId: string; productName: string; quantity: number }>,
    storeId: string,
    autoFix: boolean = false
  ): Promise<{
    canProceed: boolean;
    validationResult: ValidationResult;
    fixesApplied: string[];
  }> {
    const fixesApplied: string[] = [];
    
    // Initial validation
    const validationResult = await this.validateProductsForTransaction(items, storeId);
    
    if (autoFix && validationResult.missingProducts.length > 0) {
      console.log('🔧 Auto-fixing missing products...');
      
      // Import and use the recovery service
      const { InventoryRecoveryService } = await import('@/services/recovery/inventoryRecoveryService');
      const deployResult = await InventoryRecoveryService.deployMissingProducts(storeId);
      
      if (deployResult.deployed > 0) {
        fixesApplied.push(`Deployed ${deployResult.deployed} missing products`);
        
        // Re-validate after fixes
        const revalidationResult = await this.validateProductsForTransaction(items, storeId);
        return {
          canProceed: revalidationResult.isValid,
          validationResult: revalidationResult,
          fixesApplied
        };
      }
    }
    
    return {
      canProceed: validationResult.isValid,
      validationResult,
      fixesApplied
    };
  }
}