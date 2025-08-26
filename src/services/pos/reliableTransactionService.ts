import { createTransaction } from '@/services/transactions/createTransaction';
import { getValidPOSProducts } from '@/services/pos/productValidationService';
import { Transaction } from '@/types';

/**
 * UPDATED: Now uses clean createTransaction path instead of problematic simplified service
 * Ensures inventory sync with proper UUID handling
 */

export const processReliableTransaction = async (
  transaction: Omit<Transaction, "id" | "createdAt" | "receiptNumber">
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> => {
  
  console.log('🔄 Processing reliable transaction');
  
  try {
    // Final validation - ensure all products can still be sold
    const validationResults = await Promise.all(
      transaction.items.map(async (item) => {
        const { validateCartItem } = await import('@/services/pos/productValidationService');
        return await validateCartItem(item.productId, item.quantity);
      })
    );
    
    const invalidItem = validationResults.find(v => !v.canAdd);
    if (invalidItem) {
      return {
        success: false,
        error: invalidItem.reason || 'Product validation failed'
      };
    }
    
    // Process transaction with clean createTransaction service
    const result = await createTransaction(transaction);
    
    if (!result) {
      return {
        success: false,
        error: 'Transaction creation failed'
      };
    }
    
    console.log('✅ Reliable transaction completed:', result.id);
    
    return {
      success: true,
      transaction: result
    };
    
  } catch (error) {
    console.error('❌ Reliable transaction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get products that can be reliably sold
 * Only returns products with complete recipe-inventory mappings
 */
export const getReliableProductsForPOS = async (storeId: string) => {
  console.log('🔍 Getting reliable products for POS');
  
  try {
    // Get only validated products
    const products = await getValidPOSProducts(storeId);
    
    console.log(`✅ Found ${products.length} reliable products for POS`);
    return products;
    
  } catch (error) {
    console.error('❌ Error getting reliable products:', error);
    return [];
  }
};