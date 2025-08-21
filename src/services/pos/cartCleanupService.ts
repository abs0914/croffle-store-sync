import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StaleProductInfo {
  staleId: string;
  productName: string;
  suggestedProducts: Array<{
    id: string;
    name: string;
    hasTemplate: boolean;
  }>;
}

/**
 * Service for detecting and cleaning up stale product references in cart
 */
export class CartCleanupService {
  
  /**
   * Check if cart items reference valid products and suggest replacements
   */
  static async validateCartItems(
    cartItems: Array<{ productId: string; name: string; quantity: number }>,
    storeId: string
  ): Promise<{
    validItems: string[];
    staleItems: StaleProductInfo[];
    hasIssues: boolean;
  }> {
    const validItems: string[] = [];
    const staleItems: StaleProductInfo[] = [];
    
    try {
      // Get all product IDs from cart
      const cartProductIds = cartItems.map(item => item.productId);
      
      // Check which products exist in database
      const { data: existingProducts, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          is_active,
          recipe_id,
          recipes (
            template_id,
            recipe_templates (
              id,
              is_active
            )
          )
        `)
        .in('id', cartProductIds)
        .eq('store_id', storeId);
      
      if (error) {
        console.error('Error validating cart items:', error);
        throw error;
      }
      
      const existingIds = new Set(existingProducts?.map(p => p.id) || []);
      
      // Process each cart item
      for (const cartItem of cartItems) {
        if (existingIds.has(cartItem.productId)) {
          validItems.push(cartItem.productId);
        } else {
          // Find similar products by name
          const suggestedProducts = await this.findSimilarProducts(
            cartItem.name,
            storeId
          );
          
          staleItems.push({
            staleId: cartItem.productId,
            productName: cartItem.name,
            suggestedProducts
          });
        }
      }
      
      return {
        validItems,
        staleItems,
        hasIssues: staleItems.length > 0
      };
      
    } catch (error) {
      console.error('Error in cart validation:', error);
      
      // Return all as stale if we can't validate
      return {
        validItems: [],
        staleItems: cartItems.map(item => ({
          staleId: item.productId,
          productName: item.name,
          suggestedProducts: []
        })),
        hasIssues: true
      };
    }
  }
  
  /**
   * Find similar products by name in the same store
   */
  private static async findSimilarProducts(
    productName: string,
    storeId: string,
    limit: number = 3
  ): Promise<Array<{ id: string; name: string; hasTemplate: boolean }>> {
    try {
      // Clean the product name for comparison
      const cleanName = productName.toLowerCase().trim();
      const searchTerms = cleanName.split(/\s+/);
      
      // Build a search query using ILIKE for fuzzy matching
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          recipe_id,
          recipes (
            template_id,
            recipe_templates (
              id,
              is_active
            )
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true);
      
      // Add name similarity search
      if (searchTerms.length > 0) {
        // Use the first significant term for ILIKE search
        const mainTerm = searchTerms.find(term => term.length > 2) || searchTerms[0];
        query = query.ilike('name', `%${mainTerm}%`);
      }
      
      const { data: products, error } = await query.limit(limit);
      
      if (error) {
        console.error('Error finding similar products:', error);
        return [];
      }
      
      return (products || []).map(product => {
        const recipe = Array.isArray(product.recipes) ? product.recipes[0] : product.recipes;
        return {
          id: product.id,
          name: product.name,
          hasTemplate: !!(recipe?.recipe_templates?.id && recipe?.recipe_templates?.is_active)
        };
      });
      
    } catch (error) {
      console.error('Error in findSimilarProducts:', error);
      return [];
    }
  }
  
  /**
   * Show user-friendly notification about cart cleanup
   */
  static notifyCartIssues(staleItems: StaleProductInfo[]) {
    if (staleItems.length === 0) return;
    
    const itemNames = staleItems.map(item => item.productName).join(', ');
    
    if (staleItems.length === 1) {
      const suggestions = staleItems[0].suggestedProducts;
      if (suggestions.length > 0) {
        toast.warning(
          `Product "${staleItems[0].productName}" is no longer available. Consider: ${suggestions.map(s => s.name).join(', ')}`,
          { duration: 8000 }
        );
      } else {
        toast.error(
          `Product "${staleItems[0].productName}" is no longer available. Please refresh your cart.`,
          { duration: 6000 }
        );
      }
    } else {
      toast.error(
        `${staleItems.length} items in your cart are no longer available: ${itemNames}. Please refresh your cart.`,
        { duration: 8000 }
      );
    }
  }
  
  /**
   * Get fresh product data for cart refresh
   */
  static async getValidProducts(storeId: string) {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          description,
          image_url,
          is_active,
          recipe_id,
          recipes (
            template_id,
            recipe_templates (
              id,
              is_active
            )
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('Error fetching valid products:', error);
        return [];
      }
      
      return products || [];
      
    } catch (error) {
      console.error('Error in getValidProducts:', error);
      return [];
    }
  }
}

/**
 * Convenience function for quick cart validation
 */
export const validateAndCleanCart = async (
  cartItems: Array<{ productId: string; name: string; quantity: number }>,
  storeId: string
): Promise<boolean> => {
  const validation = await CartCleanupService.validateCartItems(cartItems, storeId);
  
  if (validation.hasIssues) {
    CartCleanupService.notifyCartIssues(validation.staleItems);
    return false;
  }
  
  return true;
};