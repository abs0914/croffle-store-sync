/**
 * Lightweight validation service for checkout as safety net
 * This provides minimal validation during payment processing
 * when proactive validation is the primary method
 */
import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/types";

export interface QuickValidationResult {
  isValid: boolean;
  invalidProducts: string[];
  message?: string;
}

/**
 * Quick validation during checkout - assumes most validation is done proactively
 */
export const quickCheckoutValidation = async (
  items: CartItem[], 
  storeId: string
): Promise<QuickValidationResult> => {
  try {
    console.log('💨 Quick checkout validation for', items.length, 'items');
    
    const productIds = items.map(item => item.productId || item.product?.id).filter(Boolean);
    
    if (productIds.length === 0) {
      return {
        isValid: false,
        invalidProducts: [],
        message: "No valid products in cart"
      };
    }

    // Quick check: verify products still exist and are available
    const { data: products, error } = await supabase
      .from('product_catalog')
      .select('id, product_name, is_available, product_status')
      .in('id', productIds)
      .eq('store_id', storeId);

    if (error) {
      console.warn('Quick validation query failed:', error);
      return {
        isValid: true, // Allow transaction to proceed if validation fails
        invalidProducts: [],
        message: "Validation check unavailable - proceeding"
      };
    }

    // Find products that are no longer available
    const invalidProducts: string[] = [];
    
    for (const item of items) {
      const productId = item.productId || item.product?.id;
      const product = products?.find(p => p.id === productId);
      
      if (!product) {
        invalidProducts.push(`${item.product?.name || 'Unknown Product'} - Not found`);
        continue;
      }
      
      if (!product.is_available || product.product_status === 'out_of_stock') {
        invalidProducts.push(`${product.product_name} - Out of stock`);
      }
    }

    return {
      isValid: invalidProducts.length === 0,
      invalidProducts,
      message: invalidProducts.length > 0 
        ? `${invalidProducts.length} item(s) unavailable` 
        : "All items validated"
    };
  } catch (error) {
    console.error('Quick validation error:', error);
    // Return valid to not block legitimate transactions
    return {
      isValid: true,
      invalidProducts: [],
      message: "Validation unavailable - transaction allowed"
    };
  }
};

/**
 * Manager override for urgent sales when validation fails
 */
export const managerOverride = async (
  items: CartItem[],
  managerAuth: string,
  reason: string
): Promise<boolean> => {
  try {
    console.log('🔓 Manager override requested for', items.length, 'items');
    
    // Simple manager override - in a real system this would verify manager credentials
    // For now, just log the override attempt
    console.warn('Manager override used:', {
      managerAuth,
      reason,
      itemCount: items.length,
      timestamp: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Manager override failed:', error);
    return false;
  }
};