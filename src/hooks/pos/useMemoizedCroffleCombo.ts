import { useMemo } from 'react';
import { CartItem } from '@/types';
import { CroffleComboPromoService, CroffleComboResult } from '@/services/cart/CroffleComboPromoService';

/**
 * Memoized croffle + coffee combo calculation to prevent excessive re-calculations
 */
export function useMemoizedCroffleCombo(cartItems: CartItem[]): CroffleComboResult {
  // Create a stable key based on cart contents
  const cartKey = useMemo(() => {
    return cartItems
      .map(item => `${item.productId}-${item.price}-${item.quantity}`)
      .sort()
      .join('|');
  }, [cartItems]);

  // Only recalculate when cart contents actually change
  const comboResult = useMemo(() => {
    if (cartItems.length === 0) {
      return {
        hasEligiblePairs: false,
        discountAmount: 0,
        pairedItems: [],
        breakdown: []
      };
    }
    
    return CroffleComboPromoService.analyzeCombo(cartItems);
  }, [cartKey, cartItems.length]);

  return comboResult;
}
