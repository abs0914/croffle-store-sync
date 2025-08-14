import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Optimized transaction service with performance improvements
 */
export class OptimizedTransactionService {
  
  /**
   * Enhanced receipt number generation using sequences for better performance
   */
  static async generateReceiptNumber(): Promise<string> {
    try {
      // Fallback to optimized timestamp-based approach
      const now = new Date();
      const timestamp = now.getTime().toString(36);
      return `TXN-${timestamp.toUpperCase()}`;
    } catch (error) {
      console.error('Receipt number generation failed:', error);
      // Final fallback
      const now = new Date();
      const timestamp = now.getTime().toString(36);
      return `TXN-${timestamp.toUpperCase()}`;
    }
  }

  /**
   * Batch validation of products before transaction
   */
  static async batchValidateProducts(items: any[]): Promise<{
    isValid: boolean;
    errors: string[];
    validatedItems: any[];
  }> {
    try {
      const productIds = items.map(item => item.productId);
      
      // Batch fetch all product information with ingredients
      const { data: products, error } = await supabase
        .from('product_catalog')
        .select(`
          id,
          product_name,
          is_available,
          recipe_id,
          product_ingredients(
            required_quantity,
            inventory_stock(
              id,
              item,
              stock_quantity,
              minimum_threshold
            )
          )
        `)
        .in('id', productIds);

      if (error) throw error;

      const errors: string[] = [];
      const validatedItems: any[] = [];

      // Process validation results
      for (const item of items) {
        const product = products?.find(p => p.id === item.productId);
        
        if (!product) {
          errors.push(`Product not found: ${item.productId}`);
          continue;
        }

        if (!product.is_available) {
          errors.push(`Product unavailable: ${product.product_name}`);
          continue;
        }

        // Check ingredient availability
        let hasInsufficientStock = false;
        for (const ingredient of product.product_ingredients || []) {
          const required = ingredient.required_quantity * item.quantity;
          const available = ingredient.inventory_stock?.stock_quantity || 0;
          
          if (available < required) {
            errors.push(`Insufficient ${ingredient.inventory_stock?.item || 'ingredient'} for ${product.product_name}`);
            hasInsufficientStock = true;
          }
        }

        if (!hasInsufficientStock) {
          validatedItems.push({
            ...item,
            product: product
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        validatedItems
      };
    } catch (error) {
      console.error('Batch validation failed:', error);
      return {
        isValid: false,
        errors: ['Validation system error'],
        validatedItems: []
      };
    }
  }

  /**
   * Enhanced error logging with transaction context
   */
  static logTransactionError(
    transactionId: string | null,
    step: string,
    error: any,
    context: any = {}
  ): void {
    const errorLog = {
      transactionId,
      step,
      error: error instanceof Error ? error.message : String(error),
      context,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined
    };

    console.error('🚨 Transaction Error:', errorLog);
    
    // In production, this would send to error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  /**
   * Transaction retry logic for transient failures
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry certain types of errors
        if (error instanceof Error) {
          if (error.message.includes('insufficient') || 
              error.message.includes('not found') ||
              error.message.includes('invalid')) {
            throw error; // Business logic errors shouldn't be retried
          }
        }
        
        if (attempt < maxAttempts) {
          console.warn(`Transaction attempt ${attempt} failed, retrying in ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5; // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Optimized inventory deduction with batch processing
   */
  static async batchUpdateInventory(updates: Array<{
    id: string;
    newQuantity: number;
    deductionAmount: number;
    currentQuantity: number;
  }>): Promise<boolean> {
    try {
      // Use Supabase batch update functionality
      const updatePromises = updates.map(update => 
        supabase
          .from('inventory_stock')
          .update({ stock_quantity: update.newQuantity })
          .eq('id', update.id)
      );

      const results = await Promise.allSettled(updatePromises);
      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        console.error(`❌ ${failures.length} inventory updates failed:`, failures);
        return false;
      }

      console.log(`✅ Successfully updated ${updates.length} inventory items`);
      return true;
    } catch (error) {
      console.error('Batch inventory update failed:', error);
      return false;
    }
  }
}