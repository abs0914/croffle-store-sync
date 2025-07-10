import { supabase } from '@/integrations/supabase/client';
import { calculateAdvancedPrice } from './advancedRecipeService';
import type { PricingCalculationInput, PricingCalculationResult } from '@/types/advancedRecipe';

// Export the types for use in components
export type { PricingCalculationResult };

// Enhanced POS integration types
export interface POSItem {
  id: string;
  name: string;
  base_category: string;
  size_category?: string;
  temperature_category?: string;
  available_addons: POSAddon[];
  combo_items: POSComboItem[];
  base_price: number;
  recipe_template_id?: string;
}

export interface POSAddon {
  id: string;
  name: string;
  category: string;
  price: number;
  is_premium: boolean;
  is_available: boolean;
}

export interface POSComboItem {
  id: string;
  name: string;
  category: string;
  combo_rules: POSComboRule[];
}

export interface POSComboRule {
  base_category: string;
  combo_category: string;
  combo_price: number;
  discount_amount: number;
}

export interface POSCartItem {
  item: POSItem;
  selected_size?: string;
  selected_temperature?: string;
  selected_addons: string[];
  selected_combos: string[];
  quantity: number;
  calculated_price: PricingCalculationResult;
}

// POS Service Class
export class POSIntegrationService {
  // Fetch menu items optimized for POS
  static async fetchPOSMenuItems(storeId?: string): Promise<POSItem[]> {
    try {
      const { data: templates, error } = await supabase
        .from('recipe_templates')
        .select(`
          id,
          name,
          category_name,
          pricing_matrix:recipe_pricing_matrix(*),
          combo_rules:combo_pricing_rules(*)
        `)
        .eq('is_active', true);

      if (error) throw error;

      const { data: addons } = await supabase
        .from('product_addon_items')
        .select('*')
        .eq('is_available', true)
        .order('display_order');

      const posItems: POSItem[] = templates.map(template => ({
        id: template.id,
        name: template.name,
        base_category: template.category_name || 'croffle',
        available_addons: (addons || []).map(addon => ({
          id: addon.id,
          name: addon.name,
          category: addon.category,
          price: addon.price,
          is_premium: addon.is_premium || false,
          is_available: addon.is_available
        })),
        combo_items: [], // Will be populated based on combo rules
        base_price: template.pricing_matrix?.[0]?.base_price || 0,
        recipe_template_id: template.id
      }));

      return posItems;
    } catch (error) {
      console.error('Error fetching POS menu items:', error);
      return [];
    }
  }

  // Calculate real-time pricing for cart item
  static async calculateItemPrice(cartItem: Partial<POSCartItem>): Promise<PricingCalculationResult> {
    if (!cartItem.item) {
      return {
        base_price: 0,
        addon_total: 0,
        combo_discount: 0,
        final_price: 0,
        breakdown: { base: 0, addons: [], combo_savings: 0 }
      };
    }

    const input: PricingCalculationInput = {
      base_category: cartItem.item.base_category,
      size_category: cartItem.selected_size,
      temperature_category: cartItem.selected_temperature,
      selected_addons: cartItem.selected_addons || [],
      combo_items: cartItem.selected_combos || []
    };

    return await calculateAdvancedPrice(input);
  }

  // Validate cart against inventory
  static async validateCartInventory(cartItems: POSCartItem[], storeId: string): Promise<{
    isValid: boolean;
    unavailableItems: string[];
    warnings: string[];
  }> {
    try {
      // Check inventory availability for each cart item
      const unavailableItems: string[] = [];
      const warnings: string[] = [];

      for (const cartItem of cartItems) {
        if (cartItem.item.recipe_template_id) {
          // Check recipe ingredients availability
          const { data: ingredients } = await supabase
            .from('recipe_template_ingredients')
            .select(`
              *,
              inventory_stock:inventory_stock(stock_quantity, minimum_threshold)
            `)
            .eq('recipe_template_id', cartItem.item.recipe_template_id);

          if (ingredients) {
            for (const ingredient of ingredients) {
              if (ingredient.inventory_stock) {
                const requiredQuantity = ingredient.quantity * cartItem.quantity;
                const availableQuantity = ingredient.inventory_stock.stock_quantity;

                if (availableQuantity < requiredQuantity) {
                  unavailableItems.push(`${cartItem.item.name} (insufficient ${ingredient.ingredient_name})`);
                } else if (availableQuantity < ingredient.inventory_stock.minimum_threshold + requiredQuantity) {
                  warnings.push(`Low stock for ${ingredient.ingredient_name} in ${cartItem.item.name}`);
                }
              }
            }
          }
        }
      }

      return {
        isValid: unavailableItems.length === 0,
        unavailableItems,
        warnings
      };
    } catch (error) {
      console.error('Error validating cart inventory:', error);
      return {
        isValid: false,
        unavailableItems: ['System error during validation'],
        warnings: []
      };
    }
  }

  // Process cart and calculate total
  static async processCart(cartItems: POSCartItem[]): Promise<{
    items: POSCartItem[];
    subtotal: number;
    total_addons: number;
    total_combos_savings: number;
    final_total: number;
  }> {
    let subtotal = 0;
    let totalAddons = 0;
    let totalComboSavings = 0;

    // Recalculate all prices
    const processedItems = await Promise.all(
      cartItems.map(async (item) => {
        const calculatedPrice = await this.calculateItemPrice(item);
        const itemWithPrice = { ...item, calculated_price: calculatedPrice };
        
        subtotal += calculatedPrice.base_price * item.quantity;
        totalAddons += calculatedPrice.addon_total * item.quantity;
        totalComboSavings += calculatedPrice.combo_discount * item.quantity;
        
        return itemWithPrice;
      })
    );

    const finalTotal = subtotal + totalAddons - totalComboSavings;

    return {
      items: processedItems,
      subtotal,
      total_addons: totalAddons,
      total_combos_savings: totalComboSavings,
      final_total: Math.max(0, finalTotal)
    };
  }

  // Get recommended combos for an item
  static async getRecommendedCombos(baseCategory: string): Promise<POSComboRule[]> {
    try {
      const { data: comboRules, error } = await supabase
        .from('combo_pricing_rules')
        .select('*')
        .eq('base_category', baseCategory)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      return comboRules || [];
    } catch (error) {
      console.error('Error fetching recommended combos:', error);
      return [];
    }
  }

  // Get popular add-ons for an item category
  static async getPopularAddons(itemCategory: string, limit: number = 5): Promise<POSAddon[]> {
    try {
      // For now, return all available addons ordered by price (premium first)
      const { data: addons, error } = await supabase
        .from('product_addon_items')
        .select('*')
        .eq('is_available', true)
        .order('is_premium', { ascending: false })
        .order('price', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (addons || []).map(addon => ({
        id: addon.id,
        name: addon.name,
        category: addon.category,
        price: addon.price,
        is_premium: addon.is_premium || false,
        is_available: addon.is_available
      }));
    } catch (error) {
      console.error('Error fetching popular addons:', error);
      return [];
    }
  }

  // Create transaction from cart
  static async createTransaction(
    cartItems: POSCartItem[],
    customerId: string | null,
    storeId: string,
    paymentMethod: string,
    cashierId: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Process final cart calculations
      const processedCart = await this.processCart(cartItems);

      // Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          customer_id: customerId,
          store_id: storeId,
          cashier_id: cashierId,
          total: processedCart.final_total,
          subtotal: processedCart.subtotal,
          discount_amount: processedCart.total_combos_savings,
          payment_method: paymentMethod,
          status: 'completed',
          items: processedCart.items.map(item => ({
            item_id: item.item.id,
            name: item.item.name,
            quantity: item.quantity,
            unit_price: item.calculated_price.base_price,
            addon_total: item.calculated_price.addon_total,
            final_price: item.calculated_price.final_price,
            selected_addons: item.selected_addons,
            selected_combos: item.selected_combos
          }))
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Deduct inventory for recipe ingredients
      for (const cartItem of processedCart.items) {
        if (cartItem.item.recipe_template_id) {
          await this.deductRecipeInventory(
            cartItem.item.recipe_template_id,
            cartItem.quantity,
            storeId
          );
        }
      }

      return { success: true, transactionId: transaction.id };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Deduct inventory for recipe ingredients
  private static async deductRecipeInventory(
    recipeTemplateId: string,
    quantity: number,
    storeId: string
  ): Promise<void> {
    try {
      const { data: ingredients } = await supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', recipeTemplateId);

      if (!ingredients) return;

      for (const ingredient of ingredients) {
        if (ingredient.inventory_stock_id) {
          const requiredQuantity = ingredient.quantity * quantity;

          // Update inventory stock directly
          await supabase
            .from('inventory_stock')
            .update({ 
              stock_quantity: supabase.sql`stock_quantity - ${requiredQuantity}` 
            })
            .eq('id', ingredient.inventory_stock_id);
        }
      }
    } catch (error) {
      console.error('Error deducting recipe inventory:', error);
      // Don't throw here to avoid breaking the transaction
    }
  }
}