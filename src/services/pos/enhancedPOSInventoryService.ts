import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  DirectInventoryIngredient,
  deductDirectInventoryIngredients,
  checkDirectIngredientAvailability
} from '@/services/recipeManagement/directInventoryService';

export interface POSInventoryItem {
  productId: string;
  variationId?: string;
  quantity: number;
  productName: string;
  hasRecipe: boolean;
  recipeId?: string;
  directIngredients?: DirectInventoryIngredient[];
}

export interface POSInventoryResult {
  available: boolean;
  totalAvailable: number;
  insufficientItems: Array<{
    item: string;
    required: number;
    available: number;
  }>;
}

/**
 * Enhanced POS Inventory Service for direct serving-ready inventory integration
 */
export class EnhancedPOSInventoryService {
  private storeId: string;

  constructor(storeId: string) {
    this.storeId = storeId;
  }

  /**
   * Check inventory availability for POS cart items
   */
  async checkCartAvailability(items: POSInventoryItem[]): Promise<POSInventoryResult> {
    const insufficientItems: Array<{ item: string; required: number; available: number }> = [];
    let totalAvailable = 0;

    try {
      for (const item of items) {
        if (item.hasRecipe && item.directIngredients) {
          // Check recipe ingredients against direct inventory
          const availability = await checkDirectIngredientAvailability(
            item.directIngredients,
            this.storeId,
            item.quantity
          );

          if (!availability.available) {
            insufficientItems.push(...availability.unavailableItems.map(unavailable => ({
              item: `${item.productName} - ${unavailable.ingredient_name}`,
              required: unavailable.required,
              available: unavailable.available
            })));
          } else {
            totalAvailable += item.quantity;
          }
        } else {
          // For non-recipe products, check direct inventory stock
          const stockAvailability = await this.checkDirectStockAvailability(
            item.productId,
            item.quantity,
            item.variationId
          );

          if (!stockAvailability.available) {
            insufficientItems.push({
              item: item.productName,
              required: item.quantity,
              available: stockAvailability.availableStock
            });
          } else {
            totalAvailable += item.quantity;
          }
        }
      }

      return {
        available: insufficientItems.length === 0,
        totalAvailable,
        insufficientItems
      };
    } catch (error) {
      console.error('Error checking cart availability:', error);
      return {
        available: false,
        totalAvailable: 0,
        insufficientItems: [{ 
          item: 'System Error', 
          required: 0, 
          available: 0 
        }]
      };
    }
  }

  /**
   * Process inventory deductions for completed POS transaction
   */
  async processTransactionDeductions(
    items: POSInventoryItem[],
    transactionId: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      for (const item of items) {
        if (item.hasRecipe && item.recipeId && item.directIngredients) {
          // Process recipe-based deduction with fractional support
          const success = await deductDirectInventoryIngredients(
            item.recipeId,
            item.directIngredients,
            item.quantity
          );

          if (!success) {
            errors.push(`Failed to deduct ingredients for ${item.productName}`);
          } else {
            // Log successful recipe usage
            await this.logRecipeUsage(
              item.recipeId,
              item.productName,
              item.quantity,
              transactionId
            );
          }
        } else {
          // Process direct stock deduction for non-recipe products
          const success = await this.deductDirectStock(
            item.productId,
            item.quantity,
            item.variationId,
            transactionId
          );

          if (!success) {
            errors.push(`Failed to deduct stock for ${item.productName}`);
          }
        }
      }

      if (errors.length === 0) {
        toast.success('Inventory updated successfully with fractional precision');
      } else {
        console.warn('Some inventory deductions failed:', errors);
      }

      return {
        success: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error processing transaction deductions:', error);
      return {
        success: false,
        errors: [`System error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Load product data with recipe information for POS
   */
  async loadPOSProductData(productIds: string[]): Promise<POSInventoryItem[]> {
    try {
      // First get products with their recipe IDs
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, name, recipe_id')
        .in('id', productIds);

      if (productError) throw productError;

      // Then get recipe ingredients for products that have recipes
      const results: POSInventoryItem[] = [];
      
      for (const product of products || []) {
        const hasRecipe = !!product.recipe_id;
        let directIngredients: DirectInventoryIngredient[] = [];

        if (hasRecipe) {
          // Get recipe template ingredients
          const { data: recipeData, error: recipeError } = await supabase
            .from('recipe_template_ingredients')
            .select(`
              ingredient_name,
              quantity,
              unit,
              cost_per_unit,
              location_type,
              inventory_stock_id
            `)
            .eq('recipe_template_id', product.recipe_id);

          if (!recipeError && recipeData) {
            directIngredients = recipeData.map((ing: any) => ({
              ingredient_name: ing.ingredient_name,
              quantity: ing.quantity,
              unit: ing.unit,
              location_type: ing.location_type || 'all',
              estimated_cost_per_unit: ing.cost_per_unit || 0,
              inventory_stock_id: ing.inventory_stock_id,
              supports_fractional: this.supportsFractionalQuantity(ing.ingredient_name)
            }));
          }
        }

        results.push({
          productId: product.id,
          productName: product.name,
          hasRecipe,
          recipeId: product.recipe_id,
          quantity: 0, // Will be set by POS
          directIngredients
        });
      }

      return results;
    } catch (error) {
      console.error('Error loading POS product data:', error);
      return [];
    }
  }

  /**
   * Get real-time inventory status for POS dashboard
   */
  async getInventoryStatus() {
    try {
      const { data: inventory, error } = await supabase
        .from('inventory_stock')
        .select(`
          id,
          item,
          serving_quantity,
          fractional_stock,
          serving_unit,
          minimum_threshold,
          cost_per_serving
        `)
        .eq('store_id', this.storeId)
        .eq('is_active', true)
        .order('item');

      if (error) throw error;

      const totalItems = inventory?.length || 0;
      const lowStockItems = inventory?.filter(item => {
        const totalStock = (item.serving_quantity || 0) + (item.fractional_stock || 0);
        return totalStock <= (item.minimum_threshold || 10);
      }).length || 0;

      const outOfStockItems = inventory?.filter(item => {
        const totalStock = (item.serving_quantity || 0) + (item.fractional_stock || 0);
        return totalStock <= 0;
      }).length || 0;

      const totalValue = inventory?.reduce((sum, item) => {
        const totalStock = (item.serving_quantity || 0) + (item.fractional_stock || 0);
        return sum + (totalStock * (item.cost_per_serving || 0));
      }, 0) || 0;

      return {
        totalItems,
        lowStockItems,
        outOfStockItems,
        healthyItems: totalItems - lowStockItems,
        totalValue,
        supportsFractional: true
      };
    } catch (error) {
      console.error('Error getting inventory status:', error);
      return {
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        healthyItems: 0,
        totalValue: 0,
        supportsFractional: false
      };
    }
  }

  /**
   * Private helper methods
   */
  private supportsFractionalQuantity(ingredientName: string): boolean {
    const miniCroffleIngredients = [
      'Croissant', 'Whipped Cream', 'Chocolate Sauce', 'Caramel Sauce',
      'Tiramisu Sauce', 'Colored Sprinkle', 'Peanut', 'Choco Flakes', 'Marshmallow'
    ];
    
    return miniCroffleIngredients.some(ingredient => 
      ingredientName.toLowerCase().includes(ingredient.toLowerCase())
    );
  }

  private async checkDirectStockAvailability(
    productId: string,
    quantity: number,
    variationId?: string
  ): Promise<{ available: boolean; availableStock: number }> {
    try {
      // For direct stock products, check serving_ready_inventory view
      const { data: stock, error } = await supabase
        .from('serving_ready_inventory')
        .select('available_servings')
        .eq('store_id', this.storeId)
        .eq('item', productId) // Assuming item maps to productId
        .single();

      if (error || !stock) {
        return { available: false, availableStock: 0 };
      }

      return {
        available: stock.available_servings >= quantity,
        availableStock: stock.available_servings
      };
    } catch (error) {
      console.error('Error checking direct stock availability:', error);
      return { available: false, availableStock: 0 };
    }
  }

  private async deductDirectStock(
    productId: string,
    quantity: number,
    variationId?: string,
    transactionId?: string
  ): Promise<boolean> {
    try {
      // For direct stock products, update serving quantities
      const { data: currentStock, error: fetchError } = await supabase
        .from('inventory_stock')
        .select('serving_quantity, fractional_stock')
        .eq('store_id', this.storeId)
        .eq('item', productId) // Assuming item maps to productId
        .single();

      if (fetchError || !currentStock) {
        console.error('Product not found in inventory:', productId);
        return false;
      }

      const currentTotal = (currentStock.serving_quantity || 0) + (currentStock.fractional_stock || 0);
      const newTotal = currentTotal - quantity;
      const newWholeStock = Math.floor(newTotal);
      const newFractionalStock = newTotal - newWholeStock;

      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({
          serving_quantity: newWholeStock,
          fractional_stock: newFractionalStock > 0 ? newFractionalStock : 0,
          updated_at: new Date().toISOString()
        })
        .eq('store_id', this.storeId)
        .eq('item', productId);

      if (updateError) {
        console.error('Error updating direct stock:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deducting direct stock:', error);
      return false;
    }
  }

  private async logRecipeUsage(
    recipeId: string,
    productName: string,
    quantity: number,
    transactionId: string
  ): Promise<void> {
    try {
      await supabase
        .from('inventory_movements')
        .insert({
          inventory_stock_id: recipeId,
          movement_type: 'recipe_usage',
          quantity_change: -quantity,
          previous_quantity: 0, // Will be calculated by trigger
          new_quantity: 0, // Will be calculated by trigger
          notes: `POS Recipe Usage: ${productName} (${quantity} units)`,
          reference_id: transactionId,
          reference_type: 'pos_transaction',
          created_by: (await supabase.auth.getUser()).data.user?.id || 'system'
        });
    } catch (error) {
      console.warn('Failed to log recipe usage:', error);
    }
  }
}