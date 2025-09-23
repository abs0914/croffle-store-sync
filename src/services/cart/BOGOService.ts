import { CartItem } from "@/types";
import { extractBaseProductName } from "@/utils/productNameUtils";

export interface BOGORule {
  targetPrice: number;
  categoryPattern: string;
  discountAmount: number;
  description: string;
}

export interface BOGOResult {
  hasEligibleItems: boolean;
  discountAmount: number;
  eligibleItems: CartItem[];
  breakdown: string[];
}

export class BOGOService {
  private static readonly BOGO_RULES: BOGORule[] = [
    {
      targetPrice: 125,
      categoryPattern: "croffle",
      discountAmount: 62.5, // 50% of ₱125
      description: "Buy 1 Regular Croffle ₱125, Get 1 Free"
    },
    {
      targetPrice: 65,
      categoryPattern: "croffle",
      discountAmount: 32.5, // 50% of ₱65
      description: "Buy 1 Mini Croffle ₱65, Get 1 Free"
    },
    {
      targetPrice: 99,
      categoryPattern: "croffle",
      discountAmount: 49.5, // 50% of ₱99
      description: "Buy 1 Overload Croffle ₱99, Get 1 Free"
    }
  ];

  /**
   * Analyzes cart items and calculates BOGO discounts
   */
  static analyzeBOGO(items: CartItem[]): BOGOResult {
    console.log("🎁 BOGO: Analyzing cart for BOGO promotions", {
      itemsCount: items.length,
      items: items.map(i => ({ name: i.product.name, price: i.price, qty: i.quantity }))
    });

    let totalDiscountAmount = 0;
    const eligibleItems: CartItem[] = [];
    const breakdown: string[] = [];

    // Group items by price point for BOGO analysis
    const priceGroups = new Map<number, CartItem[]>();
    
    items.forEach(item => {
      const baseName = extractBaseProductName(item.product.name).toLowerCase();
      
      // Check if item is a croffle (contains "croffle" in name)
      if (baseName.includes('croffle')) {
        const price = item.price;
        if (!priceGroups.has(price)) {
          priceGroups.set(price, []);
        }
        priceGroups.get(price)!.push(item);
      }
    });

    console.log("🎁 BOGO: Price groups found", Array.from(priceGroups.entries()));

    // Check each price group against BOGO rules
    this.BOGO_RULES.forEach(rule => {
      const itemsInGroup = priceGroups.get(rule.targetPrice) || [];
      
      if (itemsInGroup.length > 0) {
        // Calculate total quantity for this price group
        const totalQuantity = itemsInGroup.reduce((sum, item) => sum + item.quantity, 0);
        
        // BOGO: For every 2 items, get 1 free (50% discount on pairs)
        const pairs = Math.floor(totalQuantity / 2);
        
        if (pairs > 0) {
          const discountForThisGroup = pairs * rule.discountAmount;
          totalDiscountAmount += discountForThisGroup;
          eligibleItems.push(...itemsInGroup);
          
          breakdown.push(
            `${rule.description}: ${pairs} pair${pairs > 1 ? 's' : ''} = -₱${discountForThisGroup.toFixed(2)}`
          );
          
          console.log("🎁 BOGO: Applied discount", {
            rule: rule.description,
            totalQuantity,
            pairs,
            discountAmount: discountForThisGroup
          });
        }
      }
    });

    const result: BOGOResult = {
      hasEligibleItems: totalDiscountAmount > 0,
      discountAmount: totalDiscountAmount,
      eligibleItems,
      breakdown
    };

    console.log("🎁 BOGO: Analysis complete", result);
    return result;
  }

  /**
   * Gets BOGO rules for display purposes
   */
  static getBOGORules(): BOGORule[] {
    return [...this.BOGO_RULES];
  }

  /**
   * Checks if cart has items eligible for BOGO
   */
  static hasEligibleItems(items: CartItem[]): boolean {
    return this.analyzeBOGO(items).hasEligibleItems;
  }
}