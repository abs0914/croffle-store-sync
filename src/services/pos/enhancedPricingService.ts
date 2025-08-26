/**
 * Enhanced Pricing Service
 * Centralized pricing logic with conflict detection and detailed logging
 */

import { CartItem } from "@/types";
import { DeliveryPlatform } from "@/contexts/cart/CartContext";
import { DeliveryPlatformPricingService } from "@/services/pricing/DeliveryPlatformPricingService";
import { calculateFinalPrice } from "@/services/productVariations/productVariationsService";
import { pricingConflictDetector } from "./pricingConflictDetector";

export interface PricingCalculationResult {
  finalPrice: number;
  breakdown: {
    basePrice: number;
    variationModifier: number;
    addonPrice: number;
    platformAdjustment: number;
    discountAmount: number;
  };
  priceSource: string;
  warnings: string[];
}

class EnhancedPricingService {
  private debugMode = false;

  enableDebug(enabled: boolean = true) {
    this.debugMode = enabled;
    pricingConflictDetector.enableDebug(enabled);
  }

  /**
   * Calculate comprehensive price for a cart item
   */
  calculateItemPrice(
    cartItem: CartItem,
    platform?: DeliveryPlatform,
    categoryName?: string
  ): PricingCalculationResult {
    const warnings: string[] = [];
    
    // Start with base price
    let basePrice = cartItem.product?.price || cartItem.price || 0;
    
    // Record base price
    pricingConflictDetector.recordPriceModification(
      cartItem,
      'base',
      basePrice,
      'Initial base price'
    );

    const breakdown = {
      basePrice,
      variationModifier: 0,
      addonPrice: 0,
      platformAdjustment: 0,
      discountAmount: 0
    };

    let currentPrice = basePrice;
    let priceSource = 'base';

    // Apply variation modifications
    if (cartItem.variation) {
      const variationPrice = cartItem.variation.price || 0;
      const variationModifier = variationPrice - basePrice;
      breakdown.variationModifier = variationModifier;
      currentPrice = variationPrice;
      
      if (variationModifier !== 0) {
        pricingConflictDetector.recordPriceModification(
          cartItem,
          'variation',
          currentPrice,
          `Variation: ${cartItem.variation.name} (${variationModifier >= 0 ? '+' : ''}${variationModifier})`
        );
        priceSource = 'base + variation';
      }
    }

    // Apply addon pricing (if customization includes addons)
    if (cartItem.customization?.selected_choices) {
      const addonPrice = cartItem.customization.selected_choices.reduce(
        (sum, choice) => sum + (choice.selected_ingredient.cost_per_unit || 0), 
        0
      );
      breakdown.addonPrice = addonPrice;
      currentPrice += addonPrice;
      
      if (addonPrice > 0) {
        pricingConflictDetector.recordPriceModification(
          cartItem,
          'addon',
          currentPrice,
          `Customization addons: ${cartItem.customization.selected_choices.map(c => c.selected_ingredient.ingredient_name).join(', ')} (+${addonPrice})`
        );
        priceSource += ' + addons';
      }
    }

    // Apply platform pricing if specified
    if (platform) {
      const originalPrice = currentPrice;
      const suggestedPrice = DeliveryPlatformPricingService.calculateSuggestedPrice(
        currentPrice,
        platform,
        categoryName,
        cartItem.product?.name
      );
      
      if (suggestedPrice !== currentPrice) {
        const adjustment = suggestedPrice - currentPrice;
        breakdown.platformAdjustment = adjustment;
        currentPrice = suggestedPrice;
        
        pricingConflictDetector.recordPriceModification(
          cartItem,
          'platform_override',
          currentPrice,
          `Platform pricing for ${platform}: ${originalPrice} → ${suggestedPrice}`
        );
        priceSource += ` + ${platform} pricing`;
      }
    }

    // Log detailed calculation
    if (this.debugMode) {
      console.log('💰 Enhanced pricing calculation:', {
        product: cartItem.product?.name || 'Unknown',
        cartItemId: cartItem.productId,
        breakdown,
        finalPrice: currentPrice,
        priceSource,
        platform,
        warnings
      });
    }

    return {
      finalPrice: currentPrice,
      breakdown,
      priceSource,
      warnings
    };
  }

  /**
   * Apply bulk pricing to multiple cart items
   */
  applyBulkPlatformPricing(
    cartItems: CartItem[],
    platform: DeliveryPlatform
  ): { updatedItems: CartItem[]; overrides: any[] } {
    const overrides = DeliveryPlatformPricingService.applyBulkPlatformPricing(cartItems, platform);
    const updatedItems = [...cartItems];

    overrides.forEach((override, index) => {
      // Use the index to match with cart items since PricingOverride doesn't have productId
      const itemIndex = index < updatedItems.length ? index : -1;
      if (itemIndex !== -1) {
        const oldPrice = updatedItems[itemIndex].price;
        updatedItems[itemIndex].price = override.overriddenPrice;

        pricingConflictDetector.recordPriceModification(
          updatedItems[itemIndex],
          'bulk_override',
          override.overriddenPrice,
          `Bulk platform pricing: ${oldPrice} → ${override.overriddenPrice} (${override.reason})`
        );
      }
    });

    if (this.debugMode) {
      console.log('💰 Bulk pricing applied:', {
        platform,
        overridesCount: overrides.length,
        affectedItems: overrides.map((_, index) => updatedItems[index]?.product?.name || 'Unknown')
      });
    }

    return { updatedItems, overrides };
  }

  /**
   * Clear pricing overrides (e.g., when switching order types)
   */
  clearPricingOverrides(cartItems: CartItem[], reason: string = 'Order type changed'): CartItem[] {
    const resetItems = cartItems.map(item => {
      const history = pricingConflictDetector.getPricingHistory(item);
      if (history) {
        // Reset to original price
        const resetItem = { ...item, price: history.originalPrice };
        
        pricingConflictDetector.recordPriceModification(
          resetItem,
          'base',
          history.originalPrice,
          `Price reset: ${reason}`
        );
        
        return resetItem;
      }
      return item;
    });

    if (this.debugMode) {
      console.log('🧹 Pricing overrides cleared:', {
        reason,
        itemsReset: resetItems.length
      });
    }

    return resetItems;
  }

  /**
   * Validate cart pricing and detect issues
   */
  validateCartPricing(cartItems: CartItem[], platform?: DeliveryPlatform) {
    const validation = pricingConflictDetector.validateCartPricing(cartItems, platform);
    
    if (this.debugMode) {
      const summary = pricingConflictDetector.getPricingSummary();
      console.log('🔍 Cart pricing validation:', {
        isValid: validation.isValid,
        conflicts: validation.conflicts,
        warnings: validation.warnings,
        summary
      });
    }

    return validation;
  }

  /**
   * Get pricing insights for debugging
   */
  getPricingInsights(): any {
    return pricingConflictDetector.getPricingSummary();
  }

  /**
   * Reset all pricing history
   */
  resetPricingHistory() {
    pricingConflictDetector.clearPricingHistory();
    
    if (this.debugMode) {
      console.log('🔄 All pricing history reset');
    }
  }
}

export const enhancedPricingService = new EnhancedPricingService();