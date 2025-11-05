import { CartItem } from '@/types';

/**
 * Interface for croffle + coffee combo promotion rule
 */
export interface CroffleComboRule {
  croffleMinPrice: number;
  eligibleCoffeeProducts: string[];
  description: string;
}

/**
 * Result of analyzing cart for croffle + coffee combo
 */
export interface CroffleComboResult {
  hasEligiblePairs: boolean;
  discountAmount: number;
  pairedItems: Array<{
    croffle: CartItem;
    coffee: CartItem;
    discountApplied: number;
  }>;
  breakdown: string[];
}

export class CroffleComboPromoService {
  // Promotion enabled - Buy a croffle, get a free coffee
  private static readonly COMBO_ENABLED = true;
  private static readonly ELIGIBLE_CROFFLE_MIN_PRICE = 125.00;
  private static readonly ELIGIBLE_COFFEE_PATTERNS = [
    'americano',
    'cappuccino',
    'cafe latte',
    'café latte'
  ];

  /**
   * Analyzes cart items and calculates croffle + coffee combo discounts
   */
  static analyzeCombo(items: CartItem[]): CroffleComboResult {
    console.log('☕🥐 CROFFLE COMBO: Analyzing cart for croffle+coffee combo', {
      itemsCount: items.length,
      items: items.map(i => ({ name: i.product?.name, price: i.price, qty: i.quantity }))
    });

    if (!this.COMBO_ENABLED || items.length === 0) {
      console.log('☕🥐 CROFFLE COMBO: Promo disabled or empty cart');
      return {
        hasEligiblePairs: false,
        discountAmount: 0,
        pairedItems: [],
        breakdown: []
      };
    }

    // Separate croffles and eligible coffees
    const eligibleCroffles: CartItem[] = [];
    const eligibleCoffees: CartItem[] = [];

    items.forEach(item => {
      const itemName = item.product?.name?.toLowerCase() || '';
      const category = item.product?.category;
      const itemCategory = (typeof category === 'string' ? category : category?.name || '').toLowerCase();

      // Check if it's an eligible croffle (₱125+)
      if (itemCategory.includes('croffle') && item.price >= this.ELIGIBLE_CROFFLE_MIN_PRICE) {
        // Add each quantity as separate item for pairing
        for (let i = 0; i < item.quantity; i++) {
          eligibleCroffles.push(item);
        }
      }

      // Check if it's an eligible coffee (Americano, Cappuccino, Café Latte)
      const isEligibleCoffee = this.ELIGIBLE_COFFEE_PATTERNS.some(pattern => 
        itemName.includes(pattern)
      );

      if (isEligibleCoffee) {
        // Add each quantity as separate item for pairing
        for (let i = 0; i < item.quantity; i++) {
          eligibleCoffees.push(item);
        }
      }
    });

    console.log('☕🥐 CROFFLE COMBO: Found eligible items', {
      crofflesCount: eligibleCroffles.length,
      coffeesCount: eligibleCoffees.length,
      croffles: eligibleCroffles.map(c => ({ name: c.product?.name, price: c.price })),
      coffees: eligibleCoffees.map(c => ({ name: c.product?.name, price: c.price }))
    });

    // No eligible pairs possible
    if (eligibleCroffles.length === 0 || eligibleCoffees.length === 0) {
      console.log('☕🥐 CROFFLE COMBO: No eligible pairs found');
      return {
        hasEligiblePairs: false,
        discountAmount: 0,
        pairedItems: [],
        breakdown: []
      };
    }

    // Sort coffees by price (descending) to maximize discount value
    eligibleCoffees.sort((a, b) => b.price - a.price);

    // Create pairs: 1 croffle = 1 free coffee
    const pairedItems: Array<{
      croffle: CartItem;
      coffee: CartItem;
      discountApplied: number;
    }> = [];

    const pairsCount = Math.min(eligibleCroffles.length, eligibleCoffees.length);

    for (let i = 0; i < pairsCount; i++) {
      const croffle = eligibleCroffles[i];
      const coffee = eligibleCoffees[i];
      
      pairedItems.push({
        croffle,
        coffee,
        discountApplied: coffee.price
      });
    }

    // Calculate total discount and create breakdown
    const totalDiscount = pairedItems.reduce((sum, pair) => sum + pair.discountApplied, 0);
    
    // Group by coffee type for breakdown
    const coffeeBreakdown = new Map<string, { count: number; totalDiscount: number }>();
    
    pairedItems.forEach(pair => {
      const coffeeName = pair.coffee.product?.name || 'Coffee';
      const existing = coffeeBreakdown.get(coffeeName) || { count: 0, totalDiscount: 0 };
      coffeeBreakdown.set(coffeeName, {
        count: existing.count + 1,
        totalDiscount: existing.totalDiscount + pair.discountApplied
      });
    });

    const breakdown = Array.from(coffeeBreakdown.entries()).map(([name, data]) => {
      const qty = data.count;
      const discount = data.totalDiscount;
      return `Free ${name} (${qty}x) = -₱${discount.toFixed(2)}`;
    });

    const result = {
      hasEligiblePairs: pairedItems.length > 0,
      discountAmount: totalDiscount,
      pairedItems,
      breakdown
    };

    console.log('☕🥐 CROFFLE COMBO: Analysis complete', result);
    return result;
  }

  /**
   * Get the promotion rules
   */
  static getComboRules(): CroffleComboRule {
    return {
      croffleMinPrice: this.ELIGIBLE_CROFFLE_MIN_PRICE,
      eligibleCoffeeProducts: [...this.ELIGIBLE_COFFEE_PATTERNS],
      description: "Buy 1 Regular Croffle, Get 1 Free Coffee (Americano, Cappuccino, or Café Latte)"
    };
  }

  /**
   * Check if cart has any eligible items for combo
   */
  static hasEligibleItems(items: CartItem[]): boolean {
    return this.analyzeCombo(items).hasEligiblePairs;
  }
}
