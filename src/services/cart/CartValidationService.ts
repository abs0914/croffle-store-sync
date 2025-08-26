import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/types";
import { toast } from "sonner";

export interface CartValidationResult {
  validItems: CartItem[];
  invalidItems: CartItem[];
  removedCount: number;
  success: boolean;
}

export const CartValidationService = {
  // Validate all cart items against current database
  async validateCartItems(cartItems: CartItem[]): Promise<CartValidationResult> {
    console.log('🔍 [CartValidation] Starting validation for', cartItems.length, 'items');
    
    if (!cartItems || cartItems.length === 0) {
      return {
        validItems: [],
        invalidItems: [],
        removedCount: 0,
        success: true
      };
    }

    const validItems: CartItem[] = [];
    const invalidItems: CartItem[] = [];

    // Check each cart item against the database
    for (const item of cartItems) {
      console.log('🔍 [CartValidation] Checking item:', {
        productId: item.productId,
        name: item.product.name,
        price: item.price
      });

      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('id, name, price, is_active, store_id')
          .eq('id', item.productId)
          .single();

        if (error || !product) {
          console.error('❌ [CartValidation] Product not found:', {
            productId: item.productId,
            name: item.product.name,
            error
          });
          invalidItems.push(item);
        } else if (!product.is_active) {
          console.warn('⚠️ [CartValidation] Product inactive:', {
            productId: item.productId,
            name: product.name
          });
          invalidItems.push(item);
        } else {
          console.log('✅ [CartValidation] Product valid:', {
            productId: product.id,
            name: product.name,
            price: product.price
          });
          validItems.push(item);
        }
      } catch (error) {
        console.error('❌ [CartValidation] Validation error:', error);
        invalidItems.push(item);
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const result: CartValidationResult = {
      validItems,
      invalidItems,
      removedCount: invalidItems.length,
      success: invalidItems.length === 0
    };

    console.log('📊 [CartValidation] Validation complete:', {
      totalItems: cartItems.length,
      validItems: validItems.length,
      invalidItems: invalidItems.length,
      success: result.success
    });

    if (invalidItems.length > 0) {
      console.warn('⚠️ [CartValidation] Invalid items found:', invalidItems.map(item => ({
        id: item.productId,
        name: item.product.name
      })));
      
      toast.warning(`Found ${invalidItems.length} invalid item(s) in cart. They will be removed.`);
    } else {
      toast.success('All cart items are valid');
    }

    return result;
  },

  // Clean cart by removing invalid items
  async cleanCart(cartItems: CartItem[]): Promise<CartItem[]> {
    console.log('🧹 [CartValidation] Cleaning cart...');
    
    const validation = await this.validateCartItems(cartItems);
    
    if (validation.invalidItems.length > 0) {
      console.log('🧹 [CartValidation] Removing invalid items:', validation.invalidItems.map(item => item.product.name));
      toast.info(`Removed ${validation.invalidItems.length} invalid item(s) from cart`);
    }

    return validation.validItems;
  },

  // Check for specific problematic product IDs
  async checkForProblematicIds(cartItems: CartItem[]): Promise<{
    hasProblematic: boolean;
    problematicItems: CartItem[];
  }> {
    const problematicIds = [
      '55a665cd-f0d0-4401-b854-bf908c411e56', // The reported problematic Mini Croffle ID
      '3fa64611-6a69-4341-ac4f-c3989953a411'  // Another potential problematic ID
    ];

    const problematicItems = cartItems.filter(item => 
      problematicIds.includes(item.productId)
    );

    if (problematicItems.length > 0) {
      console.error('🚨 [CartValidation] PROBLEMATIC IDs FOUND IN CART:', problematicItems.map(item => ({
        id: item.productId,
        name: item.product.name
      })));
    }

    return {
      hasProblematic: problematicItems.length > 0,
      problematicItems
    };
  },

  // Force refresh cart with current database data
  async refreshCartData(cartItems: CartItem[], storeId: string): Promise<CartItem[]> {
    console.log('🔄 [CartValidation] Refreshing cart data for store:', storeId);
    
    if (!cartItems || cartItems.length === 0) {
      return [];
    }

    const refreshedItems: CartItem[] = [];

    for (const item of cartItems) {
      try {
        const { data: currentProduct, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', item.productId)
          .eq('store_id', storeId)
          .single();

        if (error || !currentProduct) {
          console.warn('⚠️ [CartValidation] Product no longer exists:', item.product.name);
          continue; // Skip this item
        }

        // Update the cart item with current database data
        const refreshedItem: CartItem = {
          ...item,
          product: {
            ...item.product,
            id: currentProduct.id,
            name: currentProduct.name,
            description: currentProduct.description,
            price: currentProduct.price,
            category_id: currentProduct.category_id,
            store_id: currentProduct.store_id,
            image_url: currentProduct.image_url,
            is_active: currentProduct.is_active,
            sku: currentProduct.sku,
            stock_quantity: currentProduct.stock_quantity,
            // Keep existing fields that might not be in database
            product_type: item.product.product_type || 'recipe',
            // Legacy compatibility
            isActive: currentProduct.is_active,
            storeId: currentProduct.store_id,
            categoryId: currentProduct.category_id,
            stockQuantity: currentProduct.stock_quantity
          },
          // Keep existing price unless significantly different
          price: Math.abs(item.price - currentProduct.price) > 0.01 ? currentProduct.price : item.price
        };

        refreshedItems.push(refreshedItem);
        console.log('✅ [CartValidation] Refreshed item:', {
          id: refreshedItem.productId,
          name: refreshedItem.product.name,
          oldPrice: item.price,
          newPrice: refreshedItem.price
        });

      } catch (error) {
        console.error('❌ [CartValidation] Error refreshing item:', error);
      }
    }

    console.log('🔄 [CartValidation] Refresh complete:', {
      originalItems: cartItems.length,
      refreshedItems: refreshedItems.length,
      removedItems: cartItems.length - refreshedItems.length
    });

    if (cartItems.length !== refreshedItems.length) {
      toast.info(`Cart refreshed: ${cartItems.length - refreshedItems.length} item(s) removed`);
    }

    return refreshedItems;
  }
};
