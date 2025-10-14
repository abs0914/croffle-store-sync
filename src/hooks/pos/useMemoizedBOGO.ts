import { useMemo } from 'react';
import { CartItem } from '@/types';
import { BOGOService, BOGOResult } from '@/services/cart/BOGOService';

/**
 * Memoized BOGO calculation to prevent excessive re-calculations
 */
export function useMemoizedBOGO(cartItems: CartItem[]): BOGOResult {
  // Create a stable key based on cart contents
  const cartKey = useMemo(() => {
    return cartItems
      .map(item => `${item.productId}-${item.price}-${item.quantity}`)
      .sort()
      .join('|');
  }, [cartItems]);

  // Only recalculate when cart contents actually change
  const bogoResult = useMemo(() => {
    if (cartItems.length === 0) {
      return {
        hasEligibleItems: false,
        discountAmount: 0,
        eligibleItems: [],
        breakdown: []
      };
    }
    
    return BOGOService.analyzeBOGO(cartItems);
  }, [cartKey, cartItems.length]);

  return bogoResult;
}
