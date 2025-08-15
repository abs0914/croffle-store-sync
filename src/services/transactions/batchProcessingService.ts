import { validateProductForSale } from "@/services/productCatalog/productValidationService";
import { processProductSale } from "@/services/productCatalog/inventoryIntegrationService";

export interface BatchValidationResult {
  isValid: boolean;
  errors: string[];
  validatedItems: any[];
}

export interface BatchProcessingProgress {
  stage: 'validation' | 'inventory' | 'complete';
  current: number;
  total: number;
  message: string;
}

/**
 * Batch processing service for large orders
 */
export class BatchProcessingService {
  
  /**
   * Validates multiple products in parallel batches
   */
  static async batchValidateProducts(
    items: any[], 
    onProgress?: (progress: BatchProcessingProgress) => void
  ): Promise<BatchValidationResult> {
    const batchSize = 5; // Process 5 items at a time
    const errors: string[] = [];
    const validatedItems: any[] = [];
    
    onProgress?.({
      stage: 'validation',
      current: 0,
      total: items.length,
      message: 'Validating products...'
    });
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (item) => {
        try {
          const validation = await validateProductForSale(item.productId, item.quantity);
          
          if (!validation.isValid) {
            const errorMessage = `${validation.productName}: ${validation.errors.join(', ')}`;
            return { success: false, error: errorMessage, item };
          }
          
          return { success: true, item };
        } catch (error) {
          return { 
            success: false, 
            error: `Validation failed for product ${item.productId}`, 
            item 
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Process results
      for (const result of batchResults) {
        if (result.success) {
          validatedItems.push(result.item);
        } else {
          errors.push(result.error);
        }
      }
      
      // Update progress
      onProgress?.({
        stage: 'validation',
        current: Math.min(i + batchSize, items.length),
        total: items.length,
        message: `Validated ${Math.min(i + batchSize, items.length)} of ${items.length} products`
      });
      
      // Small delay to prevent overwhelming the system
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedItems
    };
  }
  
  /**
   * Processes inventory updates in parallel batches
   */
  static async batchProcessInventory(
    items: any[], 
    storeId: string, 
    transactionId: string,
    onProgress?: (progress: BatchProcessingProgress) => void
  ): Promise<boolean> {
    const batchSize = 3; // Smaller batch size for inventory operations
    
    onProgress?.({
      stage: 'inventory',
      current: 0,
      total: items.length,
      message: 'Processing inventory updates...'
    });
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (item) => {
        try {
          return await processProductSale(
            item.productId,
            item.quantity,
            transactionId,
            storeId
          );
        } catch (error) {
          console.error(`Inventory processing failed for ${item.productId}:`, error);
          return false;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Check if any item in the batch failed
      if (batchResults.some(result => !result)) {
        console.error('Batch inventory processing failed');
        return false;
      }
      
      // Update progress
      onProgress?.({
        stage: 'inventory',
        current: Math.min(i + batchSize, items.length),
        total: items.length,
        message: `Processed ${Math.min(i + batchSize, items.length)} of ${items.length} items`
      });
      
      // Small delay between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }
    
    return true;
  }
  
  /**
   * Determines if an order should use batch processing
   */
  static shouldUseBatchProcessing(itemCount: number): boolean {
    return itemCount > 5; // Use batch processing for orders with more than 5 items
  }
  
  /**
   * Estimates processing time for an order
   */
  static estimateProcessingTime(itemCount: number): number {
    if (itemCount <= 5) return 2000; // 2 seconds for small orders
    if (itemCount <= 10) return 5000; // 5 seconds for medium orders
    return Math.min(itemCount * 800, 30000); // Max 30 seconds for large orders
  }
}