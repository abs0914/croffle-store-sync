import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

/**
 * Simplified transaction creation service - single path, fail fast
 * Removes complex fallback logic and focuses on reliable processing
 */

interface SimplifiedTransactionData {
  success: boolean;
  transaction?: Transaction;
  error?: string;
}

export const createSimplifiedTransaction = async (
  transaction: Omit<Transaction, "id" | "createdAt" | "receiptNumber">,
): Promise<SimplifiedTransactionData> => {
  try {
    console.log('🔄 Creating simplified transaction');
    
    // Pre-validate all items have proper templates
    const templateValidation = await validateItemTemplates(transaction.items, transaction.storeId);
    if (!templateValidation.success) {
      return {
        success: false,
        error: templateValidation.error
      };
    }
    
    // Generate receipt number
    const now = new Date();
    const receiptPrefix = format(now, "yyyyMMdd");
    const timestamp = format(now, "HHmmss");
    const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const receiptNumber = `${receiptPrefix}-${randomSuffix}-${timestamp}`;
    
    // Create transaction record
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        shift_id: transaction.shiftId,
        store_id: transaction.storeId,
        user_id: transaction.userId,
        customer_id: transaction.customerId || null,
        items: JSON.stringify(transaction.items),
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        discount: transaction.discount,
        discount_type: transaction.discountType || null,
        total: transaction.total,
        amount_tendered: transaction.amountTendered || null,
        change: transaction.change || null,
        payment_method: transaction.paymentMethod,
        status: transaction.status,
        receipt_number: receiptNumber,
        sequence_number: parseInt(timestamp),
        terminal_id: 'TERMINAL-01'
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Process inventory deduction
    const inventoryResult = await processInventoryDeduction(data.id, transaction.storeId, transaction.items);
    
    if (!inventoryResult.success) {
      // Rollback transaction
      await supabase.from('transactions').delete().eq('id', data.id);
      return {
        success: false,
        error: inventoryResult.error
      };
    }
    
    toast.success("Transaction completed successfully");
    
    return {
      success: true,
      transaction: {
        id: data.id,
        shiftId: data.shift_id,
        storeId: data.store_id,
        userId: data.user_id,
        customerId: data.customer_id,
        items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        discountType: data.discount_type as Transaction['discountType'],
        total: data.total,
        amountTendered: data.amount_tendered,
        change: data.change,
        paymentMethod: data.payment_method as Transaction['paymentMethod'],
        status: data.status as Transaction['status'],
        createdAt: data.created_at,
        receiptNumber: data.receipt_number
      }
    };
    
  } catch (error) {
    console.error('❌ Transaction creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Validate all items have proper recipe templates before processing
 */
async function validateItemTemplates(items: any[], storeId: string): Promise<{ success: boolean; error?: string }> {
  console.log('🔍 Validating item templates');
  
  for (const item of items) {
    // Check product has recipe template
    const { data: product } = await supabase
      .from('products')
      .select(`
        name,
        recipes (
          template_id,
          recipe_templates (
            id,
            is_active,
            recipe_template_ingredients (
              ingredient_name,
              unit,
              quantity
            )
          )
        )
      `)
      .eq('id', item.productId)
      .eq('store_id', storeId)
      .maybeSingle();
    
    if (!product) {
      return { success: false, error: `Product not found: ${item.name}` };
    }
    
    const recipe = Array.isArray(product.recipes) ? product.recipes[0] : product.recipes;
    const template = recipe?.recipe_templates;
    
    if (!template || !template.is_active) {
      return { success: false, error: `No active recipe template for: ${item.name}` };
    }
    
    if (!template.recipe_template_ingredients || template.recipe_template_ingredients.length === 0) {
      return { success: false, error: `No ingredients defined for: ${item.name}` };
    }
    
    // Check all ingredients exist in inventory
    for (const ingredient of template.recipe_template_ingredients) {
      const { data: inventoryItem } = await supabase
        .from('inventory_stock')
        .select('stock_quantity, serving_ready_quantity')
        .eq('store_id', storeId)
        .eq('item', ingredient.ingredient_name)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!inventoryItem) {
        return { success: false, error: `Missing ingredient ${ingredient.ingredient_name} for ${item.name}` };
      }
      
      const availableQty = inventoryItem.serving_ready_quantity || inventoryItem.stock_quantity || 0;
      const requiredQty = ingredient.quantity * item.quantity;
      
      if (availableQty < requiredQty) {
        return { success: false, error: `Insufficient ${ingredient.ingredient_name}: need ${requiredQty}, have ${availableQty}` };
      }
    }
  }
  
  return { success: true };
}

/**
 * Simplified inventory deduction - single path, clear error handling
 */
async function processInventoryDeduction(transactionId: string, storeId: string, items: any[]): Promise<{ success: boolean; error?: string }> {
  console.log('🔄 Processing inventory deduction');
  
  try {
    const { deductInventoryForTransaction } = await import('@/services/inventory/enhancedInventoryDeduction');
    
    // Convert items to required format
    const cartItems = await Promise.all(
      items.map(async (item) => {
        // Get recipe template ID
        const { data: product } = await supabase
          .from('products')
          .select(`
            recipes (
              recipe_templates (
                id
              )
            )
          `)
          .eq('id', item.productId)
          .maybeSingle();
        
        const recipe = Array.isArray(product?.recipes) ? product.recipes[0] : product?.recipes;
        const templateId = recipe?.recipe_templates?.id;
        
        return {
          product_name: item.name,
          quantity: item.quantity,
          recipe_template_id: templateId
        };
      })
    );
    
    const result = await deductInventoryForTransaction(transactionId, storeId, cartItems);
    
    if (!result.success) {
      const errorMsg = result.failedItems.length > 0 ? result.failedItems[0].reason : 'Inventory deduction failed';
      return { success: false, error: errorMsg };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Inventory deduction error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown inventory error' };
  }
}