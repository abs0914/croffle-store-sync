import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeductionResult {
  success: boolean;
  processedIngredients: Array<{
    ingredient: string;
    expectedQuantity: number;
    actualDeducted: number;
    unit: string;
    previousStock: number;
    newStock: number;
  }>;
  errors: string[];
  transactionId: string;
}

/**
 * Enhanced inventory deduction service with precise logging and double-deduction prevention
 */
export class EnhancedDeductionService {
  
  /**
   * Check if transaction has already been processed successfully
   */
  private static async checkTransactionHistory(transactionId: string): Promise<boolean> {
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
    
    if (!isValidUUID) {
      return false; // Test transactions don't need duplication check
    }

    const { data: existingSync } = await supabase
      .from('inventory_sync_audit')
      .select('sync_status, created_at, affected_inventory_items')
      .eq('transaction_id', transactionId)
      .eq('sync_status', 'success')
      .maybeSingle();

    if (existingSync) {
      console.log('⚠️ DOUBLE DEDUCTION PREVENTED - Transaction already processed:', {
        transactionId,
        processedAt: existingSync.created_at,
        affectedItems: existingSync.affected_inventory_items
      });
      return true;
    }

    return false;
  }

  /**
   * Enhanced ingredient deduction with detailed logging
   */
  public static async deductIngredientsWithLogging(
    productId: string,
    quantity: number,
    transactionId: string
  ): Promise<DeductionResult> {
    const result: DeductionResult = {
      success: false,
      processedIngredients: [],
      errors: [],
      transactionId
    };

    try {
      // Check for duplicate processing
      const alreadyProcessed = await this.checkTransactionHistory(transactionId);
      if (alreadyProcessed) {
        result.success = true;
        result.errors.push('Transaction already processed - prevented double deduction');
        return result;
      }

      console.log('🔄 Enhanced deduction starting:', { productId, quantity, transactionId });

      // Get product and recipe information
      const { data: productInfo } = await supabase
        .from('product_catalog')
        .select(`
          product_name,
          recipe_id,
          store_id,
          recipes!inner(
            id,
            name,
            recipe_ingredients(
              quantity,
              unit,
              inventory_stock_id,
              inventory_stock:inventory_stock!recipe_ingredients_inventory_stock_id_fkey(
                id,
                item,
                stock_quantity,
                unit,
                store_id
              )
            )
          )
        `)
        .eq('id', productId)
        .maybeSingle();

      if (!productInfo || !productInfo.recipes) {
        result.errors.push(`Product or recipe not found for ID: ${productId}`);
        return result;
      }

        const recipe = productInfo.recipes;
        const ingredients = recipe.recipe_ingredients || [];

        console.log('📊 DEDUCTION ANALYSIS:', {
          productName: productInfo.product_name,
          recipeId: recipe.id,
          quantity,
          ingredientCount: ingredients.length,
          ingredients: ingredients.map(ing => ({
            name: ing.inventory_stock?.item || 'ingredient',
            recipeQuantity: ing.quantity,
            totalNeeded: ing.quantity * quantity,
            unit: ing.unit,
            currentStock: ing.inventory_stock?.stock_quantity
          }))
        });

      // Validate and prepare deductions
      const updates = [];
      const insufficientStock = [];

      for (const ingredient of ingredients) {
        const totalNeeded = ingredient.quantity * quantity;
        const currentStock = ingredient.inventory_stock?.stock_quantity || 0;
        const newStock = currentStock - totalNeeded;

        if (newStock < 0) {
          insufficientStock.push({
            ingredient: ingredient.inventory_stock?.item || 'ingredient',
            needed: totalNeeded,
            available: currentStock,
            shortfall: Math.abs(newStock)
          });
        } else {
          updates.push({
            inventoryId: ingredient.inventory_stock_id,
            ingredient: ingredient.inventory_stock?.item || 'ingredient',
            totalNeeded,
            currentStock,
            newStock,
            unit: ingredient.unit
          });
        }
      }

      if (insufficientStock.length > 0) {
        result.errors.push(`Insufficient stock: ${insufficientStock.map(item => 
          `${item.ingredient} needs ${item.needed} but only has ${item.available}`
        ).join(', ')}`);
        
        console.error('❌ INSUFFICIENT STOCK DETECTED:', {
          productName: productInfo.product_name,
          quantity,
          insufficientItems: insufficientStock
        });
        
        return result;
      }

      // Execute deductions
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: update.newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.inventoryId);

        if (updateError) {
          result.errors.push(`Failed to update ${update.ingredient}: ${updateError.message}`);
          return result;
        }

        // Log movement
        await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: update.inventoryId,
            movement_type: 'sale',
            quantity_change: -update.totalNeeded,
            previous_quantity: update.currentStock,
            new_quantity: update.newStock,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            reference_type: 'transaction',
            reference_id: transactionId,
            notes: `Enhanced deduction: ${productInfo.product_name} (qty: ${quantity})`
          });

        result.processedIngredients.push({
          ingredient: update.ingredient,
          expectedQuantity: update.totalNeeded,
          actualDeducted: update.totalNeeded,
          unit: update.unit,
          previousStock: update.currentStock,
          newStock: update.newStock
        });

        console.log(`✅ DEDUCTED: ${update.ingredient}: ${update.currentStock} → ${update.newStock} (${-update.totalNeeded} ${update.unit})`);
      }

      // Log success to audit
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'success',
        p_error_details: null,
        p_items_processed: result.processedIngredients.length,
        p_sync_duration_ms: 0,
        p_affected_inventory_items: result.processedIngredients
      });

      result.success = true;
      console.log(`✅ ENHANCED DEDUCTION SUCCESS: ${productInfo.product_name} (${quantity}x) - ${result.processedIngredients.length} ingredients processed`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Critical error: ${errorMessage}`);
      console.error('❌ Enhanced deduction error:', error);
    }

    return result;
  }

  /**
   * Validate recipe quantities match expectations
   */
  public static async validateRecipeQuantities(productName: string, storeId?: string): Promise<{
    isValid: boolean;
    issues: Array<{
      ingredient: string;
      currentQuantity: number;
      expectedQuantity?: number;
      unit: string;
    }>;
  }> {
    const { data: recipe } = await supabase
      .from('recipes')
      .select(`
        name,
        recipe_ingredients(
          quantity,
          unit,
          inventory_stock_id,
          inventory_stock:inventory_stock!recipe_ingredients_inventory_stock_id_fkey(item)
        )
      `)
      .eq('name', productName)
      .eq('store_id', storeId || 'e78ad702-1135-482d-a508-88104e2706cf')
      .maybeSingle();

    if (!recipe) {
      return { isValid: false, issues: [] };
    }

    const ingredients = recipe.recipe_ingredients || [];
    const issues = [];

    // Define expected quantities for problematic products
    const expectedQuantities: Record<string, Record<string, number>> = {
      'Mini Croffle': {
        'Choco Flakes Toppings': 0.5,
        'Caramel Sauce': 0.5
      },
      'Oreo Strawberry Blended': {
        'Crushed Oreo': 2,
        'Frappe Powder': 30
      },
      'Croffle Overload': {
        'Peanuts Toppings': 1
      }
    };

    for (const ingredient of ingredients) {
      const ingredientName = ingredient.inventory_stock?.item;
      const expected = expectedQuantities[productName]?.[ingredientName];
      
      if (expected !== undefined && ingredient.quantity !== expected) {
        issues.push({
          ingredient: ingredientName,
          currentQuantity: ingredient.quantity,
          expectedQuantity: expected,
          unit: ingredient.unit
        });
      } else {
        issues.push({
          ingredient: ingredientName,
          currentQuantity: ingredient.quantity,
          unit: ingredient.unit
        });
      }
    }

    return {
      isValid: issues.every(issue => issue.expectedQuantity === undefined || issue.currentQuantity === issue.expectedQuantity),
      issues
    };
  }
}