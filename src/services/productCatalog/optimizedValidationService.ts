import { InventoryCacheService } from "@/services/cache/inventoryCacheService";
import { ProductValidationResult } from "./productValidationService";

/**
 * Optimized product validation using cache and batch processing
 */
export class OptimizedValidationService {
  /**
   * Batch validate multiple products with caching
   */
  static async batchValidateProducts(
    productRequests: Array<{ productId: string; quantity: number }>,
    storeId: string
  ): Promise<Map<string, ProductValidationResult>> {
    const startTime = Date.now();
    
    // Extract product IDs and quantities
    const productIds = productRequests.map(req => req.productId);
    const quantities = productRequests.map(req => req.quantity);
    
    // Use cache service for batch validation
    const validationResults = await InventoryCacheService.batchValidateProducts(
      productIds,
      quantities,
      storeId
    );
    
    // Convert to expected format
    const results = new Map<string, ProductValidationResult>();
    
    for (const [productId, validationData] of validationResults.entries()) {
      results.set(productId, {
        isValid: validationData.isValid,
        productName: validationData.productName,
        missingIngredients: !validationData.isValid,
        lowStockIngredients: validationData.errors.filter(error => 
          error.includes('Insufficient stock')
        ),
        errors: validationData.errors
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`⚡ Batch validated ${productIds.length} products in ${duration}ms using cache`);
    
    return results;
  }

  /**
   * Pre-validate cart items for real-time feedback
   */
  static async preValidateCartItems(
    items: Array<{ productId: string; quantity: number }>,
    storeId: string
  ): Promise<{
    allValid: boolean;
    invalidItems: string[];
    totalItems: number;
    validationTime: number;
  }> {
    const startTime = Date.now();
    
    const results = await this.batchValidateProducts(items, storeId);
    
    const invalidItems: string[] = [];
    let allValid = true;
    
    for (const [productId, result] of results.entries()) {
      if (!result.isValid) {
        allValid = false;
        invalidItems.push(result.productName);
      }
    }
    
    const validationTime = Date.now() - startTime;
    
    return {
      allValid,
      invalidItems,
      totalItems: items.length,
      validationTime
    };
  }

  /**
   * Validate single product with cache
   */
  static async validateSingleProduct(
    productId: string,
    quantity: number,
    storeId: string
  ): Promise<ProductValidationResult> {
    const results = await this.batchValidateProducts([{ productId, quantity }], storeId);
    return results.get(productId) || {
      isValid: false,
      productName: 'Unknown Product',
      missingIngredients: true,
      lowStockIngredients: [],
      errors: ['Product not found']
    };
  }

  /**
   * Preload validation cache for store
   */
  static async preloadValidationCache(storeId: string): Promise<void> {
    const startTime = Date.now();
    
    await InventoryCacheService.preloadStoreCache(storeId);
    
    const duration = Date.now() - startTime;
    console.log(`🚀 Preloaded validation cache for store ${storeId} in ${duration}ms`);
  }

  /**
   * Clear validation cache
   */
  static clearValidationCache(): void {
    InventoryCacheService.clearCache();
  }
}