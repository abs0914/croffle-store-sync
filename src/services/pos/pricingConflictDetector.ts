/**
 * Pricing Conflict Detection Service
 * Detects and resolves pricing conflicts between different pricing services
 */

import { CartItem } from "@/types";
import { DeliveryPlatform } from "@/contexts/cart/CartContext";
import { toast } from "sonner";

export interface PricingSource {
  source: 'base' | 'variation' | 'addon' | 'platform_override' | 'bulk_override' | 'discount';
  value: number;
  reason: string;
  timestamp: Date;
}

export interface PricingHistory {
  productId: string;
  productName: string;
  originalPrice: number;
  currentPrice: number;
  modifications: PricingSource[];
  conflicts: string[];
}

class PricingConflictDetector {
  private pricingHistory = new Map<string, PricingHistory>();
  private debugMode = false;

  enableDebug(enabled: boolean = true) {
    this.debugMode = enabled;
  }

  // Record a price modification
  recordPriceModification(
    cartItem: CartItem,
    source: PricingSource['source'],
    newPrice: number,
    reason: string
  ) {
    const key = `${cartItem.productId}_${cartItem.variationId || 'default'}`;
    
    if (!this.pricingHistory.has(key)) {
      this.pricingHistory.set(key, {
        productId: cartItem.productId,
        productName: cartItem.product?.name || 'Unknown',
        originalPrice: cartItem.price,
        currentPrice: cartItem.price,
        modifications: [],
        conflicts: []
      });
    }

    const history = this.pricingHistory.get(key)!;
    
    // Add new modification
    history.modifications.push({
      source,
      value: newPrice,
      reason,
      timestamp: new Date()
    });

    // Update current price
    history.currentPrice = newPrice;

    // Check for conflicts
    this.detectConflicts(key, history);

    if (this.debugMode) {
      console.log('💰 Price modification recorded:', {
        product: history.productName,
        source,
        oldPrice: cartItem.price,
        newPrice,
        reason,
        totalModifications: history.modifications.length
      });
    }
  }

  // Detect pricing conflicts
  private detectConflicts(key: string, history: PricingHistory) {
    const conflicts: string[] = [];
    const modifications = history.modifications;

    // Check for multiple platform overrides
    const platformOverrides = modifications.filter(m => m.source === 'platform_override');
    if (platformOverrides.length > 1) {
      conflicts.push(`Multiple platform pricing overrides detected (${platformOverrides.length})`);
    }

    // Check for bulk override after platform override
    const hasPlatformOverride = modifications.some(m => m.source === 'platform_override');
    const hasBulkOverride = modifications.some(m => m.source === 'bulk_override');
    if (hasPlatformOverride && hasBulkOverride) {
      conflicts.push('Both platform and bulk pricing overrides applied');
    }

    // Check for conflicting discount applications
    const discounts = modifications.filter(m => m.source === 'discount');
    if (discounts.length > 1) {
      conflicts.push(`Multiple discounts applied (${discounts.length})`);
    }

    // Check for price rollbacks (price going back to original after modifications)
    if (modifications.length > 2 && history.currentPrice === history.originalPrice) {
      const hasNonBaseModifications = modifications.some(m => m.source !== 'base');
      if (hasNonBaseModifications) {
        conflicts.push('Price rolled back to original after modifications');
      }
    }

    history.conflicts = conflicts;

    // Show warnings for detected conflicts
    if (conflicts.length > 0 && this.debugMode) {
      console.warn('⚠️ Pricing conflicts detected:', {
        product: history.productName,
        conflicts,
        modifications: modifications.map(m => ({
          source: m.source,
          value: m.value,
          reason: m.reason
        }))
      });

      toast.error(`Pricing conflict detected for ${history.productName}`, {
        description: conflicts[0]
      });
    }
  }

  // Get pricing history for a cart item
  getPricingHistory(cartItem: CartItem): PricingHistory | null {
    const key = `${cartItem.productId}_${cartItem.variationId || 'default'}`;
    return this.pricingHistory.get(key) || null;
  }

  // Clear pricing history (e.g., when order type changes)
  clearPricingHistory(productId?: string) {
    if (productId) {
      // Clear specific product
      const keysToDelete = Array.from(this.pricingHistory.keys())
        .filter(key => key.startsWith(productId));
      keysToDelete.forEach(key => this.pricingHistory.delete(key));
    } else {
      // Clear all
      this.pricingHistory.clear();
    }

    if (this.debugMode) {
      console.log('🧹 Pricing history cleared', { productId: productId || 'all' });
    }
  }

  // Validate cart pricing consistency
  validateCartPricing(cartItems: CartItem[], platform?: DeliveryPlatform): {
    isValid: boolean;
    conflicts: string[];
    warnings: string[];
  } {
    const conflicts: string[] = [];
    const warnings: string[] = [];

    cartItems.forEach(item => {
      const history = this.getPricingHistory(item);
      if (history) {
        conflicts.push(...history.conflicts);

        // Check if platform pricing should be applied but isn't
        if (platform && (platform === 'grab_food' || platform === 'food_panda')) {
          const hasPlatformOverride = history.modifications.some(m => m.source === 'platform_override');
          if (!hasPlatformOverride && item.price === history.originalPrice) {
            warnings.push(`${history.productName} may need platform pricing for ${platform}`);
          }
        }
      }
    });

    return {
      isValid: conflicts.length === 0,
      conflicts: [...new Set(conflicts)], // Remove duplicates
      warnings: [...new Set(warnings)]
    };
  }

  // Get pricing summary for debugging
  getPricingSummary(): {
    totalTrackedItems: number;
    itemsWithConflicts: number;
    conflictTypes: Record<string, number>;
  } {
    const items = Array.from(this.pricingHistory.values());
    const itemsWithConflicts = items.filter(item => item.conflicts.length > 0);
    const conflictTypes: Record<string, number> = {};

    itemsWithConflicts.forEach(item => {
      item.conflicts.forEach(conflict => {
        conflictTypes[conflict] = (conflictTypes[conflict] || 0) + 1;
      });
    });

    return {
      totalTrackedItems: items.length,
      itemsWithConflicts: itemsWithConflicts.length,
      conflictTypes
    };
  }
}

export const pricingConflictDetector = new PricingConflictDetector();