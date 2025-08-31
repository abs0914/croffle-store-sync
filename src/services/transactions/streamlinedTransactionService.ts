/**
 * Streamlined Transaction Service
 * Pre-payment validation + atomic transaction processing
 * Replaces complex validation chains with unified approach
 */

import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { unifiedProductInventoryService } from "@/services/unified/UnifiedProductInventoryService";
import { deductInventoryForTransaction } from "@/services/inventoryDeductionService";
import { BIRComplianceService } from "@/services/bir/birComplianceService";
import { enrichCartItemsWithCategories, insertTransactionItems, DetailedTransactionItem } from "./transactionItemsService";
import { transactionErrorLogger } from "./transactionErrorLogger";
import { toast } from "sonner";
import { format } from "date-fns";

export interface StreamlinedTransactionItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variationId?: string;
}

export interface StreamlinedTransactionData {
  storeId: string;
  userId: string;
  shiftId: string;
  customerId?: string;
  items: StreamlinedTransactionItem[];
  subtotal: number;
  tax: number;
  discount: number;
  discountType?: string;
  discountIdNumber?: string;
  total: number;
  amountTendered?: number;
  change?: number;
  paymentMethod: 'cash' | 'card' | 'e-wallet';
  paymentDetails?: any;
  orderType?: 'dine_in' | 'takeout' | 'delivery';
  deliveryPlatform?: string;
  deliveryOrderNumber?: string;
}

export interface TransactionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
}

class StreamlinedTransactionService {
  /**
   * Phase 1: Pre-payment validation (blocking)
   * Validates BEFORE payment processing begins
   */
  async validateBeforePayment(
    storeId: string,
    items: StreamlinedTransactionItem[]
  ): Promise<TransactionValidationResult> {
    const operationId = `validation_${Date.now()}`;
    console.log('🔍 Pre-payment validation started', { storeId, itemCount: items.length, operationId });

    const context = {
      storeId,
      step: 'pre_payment_validation',
      operationId,
      itemCount: items.length,
      timestamp: new Date().toISOString()
    };

    try {
      // Use unified service for comprehensive validation with REAL inventory checks
      const validation = await unifiedProductInventoryService.validateProductsForSale(
        storeId,
        items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      );

      const canProceed = validation.isValid;

      console.log('✅ Pre-payment validation completed', {
        isValid: validation.isValid,
        errors: validation.errors.length,
        warnings: validation.warnings.length,
        canProceed,
        operationId
      });

      // Log validation result
      if (!validation.isValid) {
        await transactionErrorLogger.logValidationError(
          'pre_payment_check',
          validation.errors,
          context
        );
      }

      return {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        canProceed
      };
    } catch (error) {
      console.error('❌ Pre-payment validation failed:', error);
      
      await transactionErrorLogger.logError(
        'VALIDATION_SYSTEM_ERROR',
        error instanceof Error ? error : 'Unknown validation error',
        context,
        'system_validation'
      );

      return {
        isValid: false,
        errors: [`Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        canProceed: false
      };
    }
  }

  /**
   * Phase 2: Atomic transaction processing
   * Payment -> Database -> Inventory (with rollback on failure)
   */
  async processTransaction(
    transactionData: StreamlinedTransactionData,
    cartItems?: any[]
  ): Promise<Transaction | null> {
    const operationId = `transaction_${Date.now()}`;
    
    console.log('🚀 STREAMLINED SERVICE CALLED!');
    console.log('Cart items received:', cartItems?.length || 0);
    console.log('Items to process:', transactionData.items?.length || 0);
    
    console.log('🚀 Starting atomic transaction processing', {
      storeId: transactionData.storeId,
      total: transactionData.total,
      itemCount: transactionData.items.length,
      cartItemsCount: cartItems?.length || 0,
      operationId
    });

    const context = {
      storeId: transactionData.storeId,
      userId: transactionData.userId,
      step: 'transaction_processing',
      operationId,
      itemCount: transactionData.items.length,
      totalAmount: transactionData.total,
      paymentMethod: transactionData.paymentMethod,
      timestamp: new Date().toISOString()
    };

    let createdTransactionId: string | null = null;

    try {
      // Step 1: Create transaction record
      const transaction = await this.createTransactionRecord(transactionData);
      if (!transaction) {
        throw new Error('Failed to create transaction record');
      }
      
      createdTransactionId = transaction.id;
      console.log('✅ Transaction record created:', createdTransactionId);

      // Step 2: Insert transaction items (critical for audit)
      await this.insertTransactionItems(transaction.id, transactionData.items, cartItems);
      console.log('✅ Transaction items saved');

      // Step 3: Process inventory deduction (CRITICAL)
      console.log('🔄 Processing inventory deduction...');
      const inventoryResult = await this.processInventoryDeduction(
        transaction.id,
        transactionData.storeId,
        transactionData.items,
        cartItems
      );

      if (!inventoryResult.success) {
        console.error('❌ CRITICAL: Inventory deduction failed for transaction:', transaction.id);
        console.error('❌ Inventory errors:', inventoryResult.errors);

        // Log the failure for monitoring
        await transactionErrorLogger.logInventoryError(
          'deduction_failed',
          new Error(`Inventory deduction failed: ${inventoryResult.errors.join(', ')}`),
          {
            ...context,
            transactionId: transaction.id,
            affectedItems: inventoryResult.errors
          }
        );

        toast.error(`⚠️ Transaction completed but inventory was NOT updated! Please check manually.`);
        console.warn('⚠️ Transaction completed but inventory deduction failed - MANUAL INTERVENTION REQUIRED');
      } else {
        console.log('✅ Inventory deduction completed successfully');
        toast.success('✅ Transaction and inventory updated successfully');
      }

      // Step 4: Log BIR compliance (non-critical)
      await this.logBIRCompliance(transaction, transactionData);

      toast.success('Transaction completed successfully');
      console.log('🎉 Atomic transaction processing completed successfully');
      
      return transaction;

    } catch (error) {
      console.error('❌ Atomic transaction processing failed:', error);

      // Log the error with full context
      await transactionErrorLogger.logError(
        'TRANSACTION_PROCESSING_ERROR',
        error instanceof Error ? error : 'Unknown transaction error',
        {
          ...context,
          transactionId: createdTransactionId || undefined,
          step: 'transaction_processing_failed'
        },
        'transaction_rollback'
      );

      // Rollback transaction if it was created
      if (createdTransactionId) {
        console.log('🔄 Rolling back transaction:', createdTransactionId);
        await this.rollbackTransaction(createdTransactionId);
      }

      const errorMessage = error instanceof Error ? error.message : 'Transaction processing failed';
      toast.error(`Transaction failed: ${errorMessage}`);
      
      return null;
    }
  }

  /**
   * Create the main transaction record
   */
  private async createTransactionRecord(data: StreamlinedTransactionData): Promise<Transaction | null> {
    const now = new Date();
    const receiptPrefix = format(now, "yyyyMMdd");
    const timestamp = format(now, "HHmmss");
    const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const receiptNumber = `${receiptPrefix}-${randomSuffix}-${timestamp}`;

    // BIR-compliant VAT calculations
    const grossAmount = data.subtotal;
    const discountAmount = data.discount || 0;
    const netAmount = grossAmount - discountAmount;
    const vatableSales = netAmount / 1.12;
    const vatAmount = netAmount - vatableSales;

    const transactionRecord = {
      shift_id: data.shiftId,
      store_id: data.storeId,
      user_id: data.userId,
      customer_id: data.customerId,
      items: JSON.stringify(data.items),
      subtotal: data.subtotal,
      tax: data.tax,
      discount: data.discount,
      discount_type: data.discountType,
      discount_id_number: data.discountIdNumber,
      total: data.total,
      amount_tendered: data.amountTendered,
      change: data.change,
      payment_method: data.paymentMethod,
      payment_details: data.paymentDetails,
      status: 'completed' as const,
      receipt_number: receiptNumber,
      created_at: now.toISOString(),
      order_type: data.orderType || 'dine_in',
      delivery_platform: data.deliveryPlatform,
      delivery_order_number: data.deliveryOrderNumber,
      vat_sales: vatableSales,
      vat_exempt_sales: data.discountType === 'senior' || data.discountType === 'pwd' ? discountAmount : 0,
      zero_rated_sales: 0,
      senior_citizen_discount: data.discountType === 'senior' ? discountAmount : 0,
      pwd_discount: data.discountType === 'pwd' ? discountAmount : 0,
      sequence_number: parseInt(timestamp),
      terminal_id: 'TERMINAL-01'
    };

    const { data: dbTransaction, error } = await supabase
      .from("transactions")
      .insert(transactionRecord)
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
      throw new Error(error.message);
    }

    // Map database fields to Transaction interface
    return {
      id: dbTransaction.id,
      shiftId: dbTransaction.shift_id,
      storeId: dbTransaction.store_id,
      userId: dbTransaction.user_id,
      customerId: dbTransaction.customer_id,
      items: JSON.parse(dbTransaction.items as string),
      subtotal: dbTransaction.subtotal,
      tax: dbTransaction.tax,
      discount: dbTransaction.discount,
      discountType: dbTransaction.discount_type as any,
      discountIdNumber: dbTransaction.discount_id_number,
      total: dbTransaction.total,
      amountTendered: dbTransaction.amount_tendered,
      change: dbTransaction.change,
      paymentMethod: dbTransaction.payment_method as any,
      paymentDetails: dbTransaction.payment_details as any,
      status: dbTransaction.status as 'completed' | 'voided',
      createdAt: dbTransaction.created_at,
      receiptNumber: dbTransaction.receipt_number
    };
  }

  /**
   * Insert transaction items with category enrichment
   */
  private async insertTransactionItems(
    transactionId: string,
    items: StreamlinedTransactionItem[],
    cartItems?: any[]
  ): Promise<void> {
    try {
      if (cartItems && cartItems.length > 0) {
        const enrichedItems = await enrichCartItemsWithCategories(cartItems);
        await insertTransactionItems(transactionId, enrichedItems);
      } else {
        // Create basic items from transaction data - handle combo products
        const basicItems: DetailedTransactionItem[] = [];
        
        for (const item of items) {
          // Check if this is a combo product
          if (item.productId.startsWith('combo-')) {
            console.log('🔧 Processing combo item in transaction:', item.productId);
            
            // Expand combo product into component items
            const comboComponents = await this.expandComboProductForTransaction(item);
            basicItems.push(...comboComponents);
          } else {
            // Regular product
            basicItems.push({
              product_id: item.productId,
              variation_id: item.variationId || undefined,
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: item.totalPrice,
              category_id: undefined,
              category_name: 'Unknown',
              product_type: 'direct'
            });
          }
        }
        
        await insertTransactionItems(transactionId, basicItems);
      }
    } catch (error) {
      console.error('❌ Failed to insert transaction items:', error);
      throw new Error('Failed to save transaction items');
    }
  }

  /**
   * Expand combo product for transaction processing
   */
  private async expandComboProductForTransaction(item: StreamlinedTransactionItem): Promise<DetailedTransactionItem[]> {
    try {
      // Extract component IDs from combo ID: "combo-{croffle-id}-{espresso-id}"
      const comboIdParts = item.productId.split('-');
      if (comboIdParts.length !== 3) {
        throw new Error(`Invalid combo ID format: ${item.productId}`);
      }
      
      const croffleId = comboIdParts[1];
      const espressoId = comboIdParts[2];
      
      // Fetch component products
      const { data: croffleProduct } = await supabase
        .from('product_catalog')
        .select(`id, product_name, category_id, price, categories (id, name)`)
        .eq('id', croffleId)
        .maybeSingle();
        
      const { data: espressoProduct } = await supabase
        .from('product_catalog')
        .select(`id, product_name, category_id, price, categories (id, name)`)
        .eq('id', espressoId)
        .maybeSingle();

      const comboItems: DetailedTransactionItem[] = [];
      
      // Calculate proportional pricing
      const crofflePrice = croffleProduct?.price || 0;
      const espressoPrice = espressoProduct?.price || 0;
      const totalComboPrice = item.totalPrice;
      const totalOriginalPrice = crofflePrice + espressoPrice;
      
      const croffleProportionalPrice = totalOriginalPrice > 0 ? 
        (crofflePrice / totalOriginalPrice) * totalComboPrice : totalComboPrice / 2;
      const espressoProportionalPrice = totalComboPrice - croffleProportionalPrice;

      // Add component items
      if (croffleProduct) {
        comboItems.push({
          product_id: croffleId,
          variation_id: undefined,
          name: `${croffleProduct.product_name} (from ${item.name})`,
          quantity: item.quantity,
          unit_price: croffleProportionalPrice / item.quantity,
          total_price: croffleProportionalPrice,
          category_id: croffleProduct.category_id,
          category_name: croffleProduct.categories?.name,
          product_type: 'combo_component'
        });
      }
      
      if (espressoProduct) {
        comboItems.push({
          product_id: espressoId,
          variation_id: undefined,
          name: `${espressoProduct.product_name} (from ${item.name})`,
          quantity: item.quantity,
          unit_price: espressoProportionalPrice / item.quantity,
          total_price: espressoProportionalPrice,
          category_id: espressoProduct.category_id,
          category_name: espressoProduct.categories?.name,
          product_type: 'combo_component'
        });
      }
      
      return comboItems;
    } catch (error) {
      console.error('❌ Failed to expand combo for transaction:', error);
      
      // Fallback: use placeholder UUID
      return [{
        product_id: '00000000-0000-0000-0000-000000000000',
        variation_id: undefined,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        category_id: undefined,
        category_name: 'Combo',
        product_type: 'combo'
      }];
    }
  }

  /**
   * Process inventory deduction with comprehensive logging and Mix & Match base ingredient support
   */
  private async processInventoryDeduction(
    transactionId: string,
    storeId: string,
    items: StreamlinedTransactionItem[],
    cartItems?: any[]
  ): Promise<{ success: boolean; errors: string[] }> {
    console.log(`🔄 Starting inventory deduction for transaction: ${transactionId}`);
    console.log(`📍 Store ID: ${storeId}`);
    console.log(`📦 Items to process: ${items.length}`);

    try {
      // Build deduction items, expanding combos and handling Mix & Match base ingredients
      const transactionItems: Array<{ product_id?: string; name: string; quantity: number; unit_price: number; total_price: number }> = [];
      const processedIngredients = new Set<string>(); // Prevent duplicate deductions

      for (const item of items) {
        if (item.productId?.startsWith('combo-')) {
          console.log('🔧 Expanding combo in deduction path:', item.productId);
          try {
            const components = await this.expandComboProductForTransaction(item);
            for (const comp of components) {
              transactionItems.push({
                product_id: comp.product_id,
                name: comp.name,
                quantity: comp.quantity,
                unit_price: comp.unit_price,
                total_price: comp.total_price
              });
            }
          } catch (e) {
            console.warn('⚠️ Failed to expand combo for deduction, falling back to name-only:', e);
            transactionItems.push({
              product_id: undefined,
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: item.totalPrice
            });
          }
        } else {
          // Check if this is a Mix & Match product
          const matchingCart = cartItems?.find(ci => ci.productId === item.productId && (ci.variationId || null) === (item.variationId || null));
          const isMixMatch = matchingCart?.customization?.type === 'mix_match_croffle';
          
          console.log(`🔍 DEBUGGING Mix & Match detection for ${item.name}:`, {
            hasCartItems: !!cartItems,
            cartItemsLength: cartItems?.length || 0,
            itemProductId: item.productId,
            matchingCart: !!matchingCart,
            customizationType: matchingCart?.customization?.type,
            isMixMatch
          });
          
          if (isMixMatch) {
            console.log(`🎯 Processing Mix & Match product: ${item.name}`);
            
            // SAFE IMPLEMENTATION: Add base ingredient deduction for Mix & Match
            // Find the base croffle recipe to deduct base ingredients
            await this.processBaseRecipeIngredients(
              item, 
              transactionItems, 
              processedIngredients,
              storeId
            );
            
            // Preserve existing addon processing (don't break working functionality)
            const mixMatchCombo = matchingCart.customization?.combo;
            if (mixMatchCombo) {
              const allSelected: Array<{ id: string; name: string }> = [];
              (mixMatchCombo.toppings || []).forEach((sel: any) => allSelected.push({ id: sel.addon?.id, name: sel.addon?.name }));
              (mixMatchCombo.sauces || []).forEach((sel: any) => allSelected.push({ id: sel.addon?.id, name: sel.addon?.name }));

              for (const sel of allSelected) {
                if (!sel?.id || !sel?.name) continue;
                const addonKey = `addon_${sel.id}_${sel.name}`;
                if (!processedIngredients.has(addonKey)) {
                  transactionItems.push({
                    product_id: sel.id,
                    name: sel.name,
                    quantity: item.quantity,
                    unit_price: 0,
                    total_price: 0
                  });
                  processedIngredients.add(addonKey);
                  console.log(`  ✅ Added addon: ${sel.name} (qty: ${item.quantity})`);
                }
              }
            }
          } else {
            // Regular product - preserve existing functionality
            transactionItems.push({
              product_id: item.productId,
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: item.totalPrice
            });
          }
        }
      }

      console.log(`📋 Transaction items for deduction (${transactionItems.length} items):`, 
        transactionItems.map(ti => `${ti.name} (qty: ${ti.quantity})`));

      const result = await deductInventoryForTransaction(
        transactionId,
        storeId,
        transactionItems
      );

      console.log(`📊 Inventory deduction result:`, {
        success: result.success,
        deductedItems: result.deductedItems?.length || 0,
        errors: result.errors?.length || 0,
        warnings: result.warnings?.length || 0
      });

      // Enhanced success logging for monitoring
      if (result.success) {
        console.log(`✅ INVENTORY DEDUCTION SUCCESS for transaction ${transactionId}`);
        console.log(`   Deducted ingredients:`, result.deductedItems.map(item => 
          `${item.ingredient}: -${item.deducted} ${item.unit} (${item.previousStock}→${item.newStock})`
        ));
      } else {
        console.error(`❌ INVENTORY DEDUCTION FAILED for transaction ${transactionId}`);
        console.error(`   Errors:`, result.errors);
        console.error(`   Warnings:`, result.warnings);
      }

      return {
        success: result.success,
        errors: result.errors || []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Inventory deduction failed';
      console.error(`❌ CRITICAL: Inventory deduction system error for transaction ${transactionId}:`, error);
      return {
        success: false,
        errors: [errorMessage]
      };
    }
  }

  /**
   * Process base recipe ingredients for Mix & Match products
   * SAFE IMPLEMENTATION: Add base croffle ingredients without breaking existing functionality
   */
  private async processBaseRecipeIngredients(
    item: StreamlinedTransactionItem,
    transactionItems: Array<{ product_id?: string; name: string; quantity: number; unit_price: number; total_price: number }>,
    processedIngredients: Set<string>,
    storeId: string
  ): Promise<void> {
    try {
      console.log(`  🔍 Finding base recipe for Mix & Match: ${item.name}`);
      
      // Extract base croffle name from Mix & Match display name
      // e.g., "Mini Croffle with Choco Flakes and Tiramisu" → "Mini Croffle"
      const baseName = item.name
        .replace(/\s+with\s+.+$/i, '')    // Remove " with ..." suffix
        .replace(/\s*\(from[^)]*\)/i, '') // Remove "(from ...)" 
        .trim();
      
      if (baseName === item.name) {
        console.log(`  ⚠️ No base name extraction needed for: ${item.name}`);
        return;
      }
      
      console.log(`  🎯 Extracted base name: "${baseName}" from "${item.name}"`);
      
      // Find base recipe template (e.g., "Mini Croffle", "Regular Croffle") 
      const { data: baseTemplate, error: templateError } = await supabase
        .from('recipe_templates')
        .select('id, name')
        .eq('name', baseName)
        .eq('is_active', true)
        .maybeSingle();
      
      if (templateError) {
        console.warn(`  ⚠️ Error finding base template for "${baseName}":`, templateError.message);
        return;
      }
      
      if (!baseTemplate) {
        console.warn(`  ⚠️ No base template found for "${baseName}"`);
        return;
      }
      
      console.log(`  ✅ Found base template: ${baseTemplate.name} (ID: ${baseTemplate.id})`);
      
      // Get base recipe ingredients  
      const { data: baseIngredients, error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .select('ingredient_name, quantity, unit, cost_per_unit')
        .eq('recipe_template_id', baseTemplate.id);
      
      if (ingredientsError) {
        console.warn(`  ⚠️ Error getting base ingredients:`, ingredientsError.message);
        return;
      }
      
      if (!baseIngredients || baseIngredients.length === 0) {
        console.warn(`  ⚠️ No base ingredients found for template: ${baseTemplate.name}`);
        return;
      }
      
      console.log(`  📋 Found ${baseIngredients.length} base ingredients:`, 
        baseIngredients.map(ing => `${ing.ingredient_name} (${ing.quantity} ${ing.unit})`));
      
      // Add base ingredients to deduction items (with duplicate prevention)
      for (const ingredient of baseIngredients) {
        const ingredientKey = `base_${ingredient.ingredient_name}`;
        if (!processedIngredients.has(ingredientKey)) {
          // Create virtual item for base ingredient deduction
          transactionItems.push({
            product_id: undefined, // Let the inventory service resolve by name
            name: ingredient.ingredient_name,
            quantity: ingredient.quantity * item.quantity, // Scale by transaction quantity
            unit_price: ingredient.cost_per_unit || 0,
            total_price: 0
          });
          processedIngredients.add(ingredientKey);
          console.log(`  ✅ Added base ingredient: ${ingredient.ingredient_name} (qty: ${ingredient.quantity * item.quantity})`);
        } else {
          console.log(`  ⏭️ Skipping duplicate base ingredient: ${ingredient.ingredient_name}`);
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing base recipe ingredients for ${item.name}:`, error);
      // Don't throw - preserve existing functionality even if base ingredient processing fails
    }
  }

  /**
   * Log BIR compliance (non-critical)
   */
  private async logBIRCompliance(
    transaction: Transaction,
    data: StreamlinedTransactionData
  ): Promise<void> {
    try {
      await BIRComplianceService.logAuditEvent(
        data.storeId,
        'transaction',
        'Transaction Completed',
        {
          receiptNumber: transaction.receiptNumber,
          total: transaction.total,
          paymentMethod: transaction.paymentMethod,
          items: data.items.length
        },
        data.userId,
        undefined,
        'TERMINAL-01',
        transaction.id,
        transaction.receiptNumber
      );
    } catch (error) {
      console.warn('⚠️ BIR audit logging failed (non-critical):', error);
    }
  }

  /**
   * Rollback transaction on failure
   */
  private async rollbackTransaction(transactionId: string): Promise<void> {
    try {
      // Delete transaction items first
      await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', transactionId);

      // Delete transaction
      await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      console.log('✅ Transaction rollback completed');
    } catch (error) {
      console.error('❌ Transaction rollback failed:', error);
    }
  }
}

export const streamlinedTransactionService = new StreamlinedTransactionService();