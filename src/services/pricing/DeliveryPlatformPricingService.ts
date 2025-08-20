import { DeliveryPlatform } from '@/contexts/cart/CartContext';
import { CartItem } from '@/types';

export interface PlatformPricingRule {
  platform: DeliveryPlatform;
  markupType: 'percentage' | 'fixed' | 'product_specific';
  markupValue: number;
  minPrice?: number;
  maxPrice?: number;
  applyToCategories?: string[];
  productPricing?: Record<string, number>; // Product name to price mapping
}

export interface PricingOverride {
  originalPrice: number;
  overriddenPrice: number;
  reason: string;
  appliedRule?: PlatformPricingRule;
}

export class DeliveryPlatformPricingService {
  private static defaultRules: PlatformPricingRule[] = [
    {
      platform: 'grab_food',
      markupType: 'product_specific',
      markupValue: 0,
      productPricing: {
        'Choco Marshmallow Croffle': 155,
        'Mini Croffle': 80,
        // Add other croffle variants here as needed
        'Croffle Overload': 155,
        'Plain Croffle': 155,
        'Bacon Croffle': 155,
        'Ham and Cheese Croffle': 155,
        'Nutella Croffle': 155,
        'Peanut Butter Croffle': 155
      }
    },
    {
      platform: 'food_panda',
      markupType: 'product_specific',
      markupValue: 0,
      productPricing: {
        'Choco Marshmallow Croffle': 155,
        'Mini Croffle': 80,
        // Add other croffle variants here as needed
        'Croffle Overload': 155,
        'Plain Croffle': 155,
        'Bacon Croffle': 155,
        'Ham and Cheese Croffle': 155,
        'Nutella Croffle': 155,
        'Peanut Butter Croffle': 155
      }
    }
  ];

  /**
   * Calculate suggested price for a delivery platform
   */
  static calculateSuggestedPrice(
    originalPrice: number, 
    platform: DeliveryPlatform,
    categoryName?: string,
    productName?: string
  ): number {
    const rule = this.defaultRules.find(r => r.platform === platform);
    if (!rule) return originalPrice;

    // Check for product-specific pricing first
    if (rule.markupType === 'product_specific' && rule.productPricing && productName) {
      const specificPrice = rule.productPricing[productName];
      if (specificPrice !== undefined) {
        return specificPrice;
      }
    }

    // Check if rule applies to this category
    if (rule.applyToCategories && categoryName && !rule.applyToCategories.includes(categoryName)) {
      return originalPrice;
    }

    let adjustedPrice = originalPrice;

    if (rule.markupType === 'percentage') {
      adjustedPrice = originalPrice * (1 + rule.markupValue / 100);
    } else if (rule.markupType === 'fixed') {
      adjustedPrice = originalPrice + rule.markupValue;
    }

    // Apply min/max constraints
    if (rule.minPrice && adjustedPrice < rule.minPrice) {
      adjustedPrice = rule.minPrice;
    }
    if (rule.maxPrice && adjustedPrice > rule.maxPrice) {
      adjustedPrice = rule.maxPrice;
    }

    return Math.round(adjustedPrice * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get platform display name
   */
  static getPlatformDisplayName(platform: DeliveryPlatform): string {
    const names = {
      grab_food: 'Grab Food',
      food_panda: 'FoodPanda'
    };
    return names[platform] || platform;
  }

  /**
   * Apply bulk price override to cart items for a platform
   */
  static applyBulkPlatformPricing(
    items: CartItem[],
    platform: DeliveryPlatform
  ): PricingOverride[] {
    const overrides: PricingOverride[] = [];

    items.forEach((item, index) => {
      const originalPrice = item.price;
      const productName = item.product.name;
      const suggestedPrice = this.calculateSuggestedPrice(
        originalPrice,
        platform,
        typeof item.product.category === 'string' 
          ? item.product.category 
          : item.product.category?.name || item.product.name, // Safe access with fallback
        productName
      );

      if (suggestedPrice !== originalPrice) {
        overrides.push({
          originalPrice,
          overriddenPrice: suggestedPrice,
          reason: `${this.getPlatformDisplayName(platform)} platform pricing`,
          appliedRule: this.defaultRules.find(r => r.platform === platform)
        });
      }
    });

    return overrides;
  }

  /**
   * Validate if a price override is within acceptable ranges
   */
  static validatePriceOverride(
    originalPrice: number,
    newPrice: number,
    platform: DeliveryPlatform
  ): { isValid: boolean; reason?: string } {
    if (newPrice <= 0) {
      return { isValid: false, reason: 'Price must be greater than zero' };
    }

    const rule = this.defaultRules.find(r => r.platform === platform);
    if (!rule) {
      return { isValid: true };
    }

    if (rule.minPrice && newPrice < rule.minPrice) {
      return { 
        isValid: false, 
        reason: `Price cannot be below ₱${rule.minPrice} for ${this.getPlatformDisplayName(platform)}` 
      };
    }

    if (rule.maxPrice && newPrice > rule.maxPrice) {
      return { 
        isValid: false, 
        reason: `Price cannot exceed ₱${rule.maxPrice} for ${this.getPlatformDisplayName(platform)}` 
      };
    }

    // Check if price is significantly below original (more than 50% discount)
    if (newPrice < originalPrice * 0.5) {
      return { 
        isValid: false, 
        reason: 'Price override cannot be more than 50% below original price' 
      };
    }

    return { isValid: true };
  }
}