import { validateProductForSale } from "@/services/productCatalog/productValidationService";
import { processProductSale } from "@/services/productCatalog/inventoryIntegrationService";

export interface EnhancedBatchValidationResult {
  isValid: boolean;
  errors: string[];
  validatedItems: any[];
  failedItems: { item: any; error: string }[];
}

export interface EnhancedBatchProcessingProgress {
  stage: 'validation' | 'inventory' | 'complete';
  current: number;
  total: number;
  message: string;
  errors: string[];
}

export interface EnhancedInventoryResult {
  success: boolean;
  errors: string[];
  processedItems: any[];
  failedItems: { item: any; error: string }[];
}

/**
 * Enhanced batch processing service with comprehensive error handling and rollback
 */
export class EnhancedBatchProcessingService {
  
  /**
   * Validates multiple products with detailed error tracking
   */
  static async batchValidateProductsWithErrorHandling(
    items: any[], 
    onProgress?: (progress: EnhancedBatchProcessingProgress) => void
  ): Promise<EnhancedBatchValidationResult> {
    const batchSize = 5;
    const errors: string[] = [];
    const validatedItems: any[] = [];
    const failedItems: { item: any; error: string }[] = [];
    
    onProgress?.({
      stage: 'validation',
      current: 0,
      total: items.length,
      message: 'Starting enhanced validation...',
      errors: []
    });
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch in parallel with enhanced error tracking
      const batchPromises = batch.map(async (item) => {
        try {
          console.log(`🔍 Validating: ${item.name} (${item.productId})`);
          
          const validation = await validateProductForSale(item.productId, item.quantity);
          
          if (!validation.isValid) {
            const errorMessage = `${validation.productName}: ${validation.errors.join(', ')}`;
            console.error(`❌ Validation failed: ${errorMessage}`);
            
            return { 
              success: false, 
              error: errorMessage, 
              item,
              details: validation
            };
          }
          
          console.log(`✅ Validation passed: ${item.name}`);
          return { success: true, item, details: validation };
          
        } catch (error) {
          const errorMessage = `Validation exception for ${item.name}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`❌ ${errorMessage}`);
          
          return { 
            success: false, 
            error: errorMessage, 
            item,
            details: null
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results with detailed tracking
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            validatedItems.push(result.value.item);
          } else {
            errors.push(result.value.error);
            failedItems.push({
              item: result.value.item,
              error: result.value.error
            });
          }
        } else {
          const item = batch[j];
          const errorMessage = `Validation promise failed for ${item.name}: ${result.reason}`;
          errors.push(errorMessage);
          failedItems.push({
            item,
            error: errorMessage
          });
        }
      }
      
      // Update progress with error information
      onProgress?.({
        stage: 'validation',
        current: Math.min(i + batchSize, items.length),
        total: items.length,
        message: `Validated ${Math.min(i + batchSize, items.length)}/${items.length} - ${errors.length} errors`,
        errors: errors.slice(-5) // Show last 5 errors
      });
      
      // Small delay to prevent overwhelming
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedItems,
      failedItems
    };
  }
  
  /**
   * Processes inventory updates with enhanced error handling and rollback
   */
  static async batchProcessInventoryWithErrorHandling(
    items: any[], 
    storeId: string, 
    transactionId: string,
    onProgress?: (progress: EnhancedBatchProcessingProgress) => void
  ): Promise<EnhancedInventoryResult> {
    const batchSize = 3; // Smaller batches for inventory operations
    const errors: string[] = [];
    const processedItems: any[] = [];
    const failedItems: { item: any; error: string }[] = [];
    
    onProgress?.({
      stage: 'inventory',
      current: 0,
      total: items.length,
      message: 'Starting enhanced inventory processing...',
      errors: []
    });
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch with comprehensive error handling
      const batchPromises = batch.map(async (item) => {
        try {
          console.log(`🔄 Processing inventory: ${item.name} (${item.productId})`);
          
          const success = await processProductSale(
            item.productId,
            item.quantity,
            transactionId,
            storeId
          );
          
          if (!success) {
            console.error(`❌ Inventory processing failed: ${item.name}`);
            return {
              success: false,
              error: `Failed to process inventory for ${item.name}`,
              item
            };
          }
          
          console.log(`✅ Inventory processed: ${item.name}`);
          return { success: true, item };
          
        } catch (error) {
          const errorMessage = `Inventory exception for ${item.name}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`❌ ${errorMessage}`);
          
          return {
            success: false,
            error: errorMessage,
            item
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            processedItems.push(result.value.item);
          } else {
            errors.push(result.value.error);
            failedItems.push({
              item: result.value.item,
              error: result.value.error
            });
          }
        } else {
          const item = batch[j];
          const errorMessage = `Inventory promise failed for ${item.name}: ${result.reason}`;
          errors.push(errorMessage);
          failedItems.push({
            item,
            error: errorMessage
          });
        }
      }
      
      // If any failures in this batch, stop processing and rollback
      if (failedItems.length > 0) {
        console.error('❌ Batch inventory processing failed - stopping and rolling back');
        
        // Attempt rollback of successfully processed items
        if (processedItems.length > 0) {
          try {
            await this.rollbackInventoryForItems(processedItems, transactionId);
            console.log('✅ Rollback completed for processed items');
          } catch (rollbackError) {
            console.error('❌ Rollback failed:', rollbackError);
            errors.push(`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
          }
        }
        
        return {
          success: false,
          errors,
          processedItems: [],
          failedItems
        };
      }
      
      // Update progress
      onProgress?.({
        stage: 'inventory',
        current: Math.min(i + batchSize, items.length),
        total: items.length,
        message: `Processed ${Math.min(i + batchSize, items.length)}/${items.length} items`,
        errors: []
      });
      
      // Small delay between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }
    
    return {
      success: true,
      errors: [],
      processedItems,
      failedItems: []
    };
  }
  
  /**
   * Rollback inventory for failed batch processing
   */
  private static async rollbackInventoryForItems(
    items: any[],
    transactionId: string
  ): Promise<void> {
    console.log('🔄 Rolling back inventory for items:', items.map(i => i.name));
    
    // Import rollback utilities
    const { rollbackProcessedItems } = await import('./inventoryRollbackService');
    
    await rollbackProcessedItems(
      items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity
      })),
      transactionId
    );
  }
  
  /**
   * Enhanced batch processing decision logic
   */
  static shouldUseBatchProcessing(itemCount: number): boolean {
    return itemCount > 5;
  }
  
  /**
   * Estimates processing time with error consideration
   */
  static estimateProcessingTime(itemCount: number, hasComplexProducts: boolean = false): number {
    const baseTime = itemCount <= 5 ? 2000 : itemCount <= 10 ? 5000 : Math.min(itemCount * 800, 30000);
    
    // Add buffer time for complex products (combos, products with many ingredients)
    const complexityFactor = hasComplexProducts ? 1.5 : 1.0;
    
    return Math.ceil(baseTime * complexityFactor);
  }
}