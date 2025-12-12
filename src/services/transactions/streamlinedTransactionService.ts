/**
 * Streamlined Transaction Service
 * Pre-payment validation + atomic transaction processing
 * Replaces complex validation chains with unified approach
 */

import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { BatchedAtomicInventoryService, DeductionItem } from "@/services/inventory/batchedAtomicInventoryService";
import { AtomicInventoryService } from "@/services/inventory/atomicInventoryService";
import { unifiedProductInventoryService } from "@/services/unified/UnifiedProductInventoryService";
import { BIRComplianceService } from "@/services/bir/birComplianceService";
import { batchEnrichCartItems, DetailedTransactionItem } from "./batchedTransactionItemsService";
import { insertTransactionItems } from "./transactionItemsService";
import { transactionErrorLogger } from "./transactionErrorLogger";
import { extractBaseProductName } from "@/utils/productNameUtils";
import { toast } from "sonner";
import { format } from "date-fns";
import { parallelTransactionProcessor } from "./ParallelTransactionProcessor";
import { performanceMonitor } from "@/utils/performanceMonitor";

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
  // Detailed discount information
  seniorDiscounts?: Array<{
    id: string;
    idNumber: string;
    name: string;
    discountAmount: number;
  }>;
  otherDiscount?: {
    type: 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary' | 'bogo' | 'regular' | 'custom' | 'athletes_coaches' | 'solo_parent';
    amount: number;
    idNumber?: string;
    justification?: string;
  };
  vatExemption?: number;
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
      // ✅ SALE IS SACROSANCT: Validation errors should NOT block sales
      // If validation system fails, allow transaction to proceed with warning
      console.error('❌ Pre-payment validation failed (allowing transaction to proceed):', error);
      
      await transactionErrorLogger.logError(
        'VALIDATION_SYSTEM_ERROR',
        error instanceof Error ? error : 'Unknown validation error',
        context,
        'system_validation'
      );

      // Return canProceed: true so sales are never blocked by validation errors
      return {
        isValid: true, // ✅ Allow transaction to proceed
        errors: [],
        warnings: [`Validation check skipped: ${error instanceof Error ? error.message : 'Unknown error'}`],
        canProceed: true // ✅ CRITICAL: Sale must proceed
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
  ): Promise<Transaction> {
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

      // Step 3 & 4: PARALLEL EXECUTION (Phase 3 Optimization)
      // Inventory deduction and BIR logging run simultaneously for 60-70% speed improvement
      console.log('🚀 [PHASE 3] Starting parallel operations (inventory + BIR)');
      
      // CRITICAL FIX: Expand combo items BEFORE inventory deduction
      const expandedItems = await this.expandItemsForInventory(transactionData.items);
      console.log(`🔄 COMBO EXPANSION: ${transactionData.items.length} items → ${expandedItems.length} expanded items`);
      
      // Create optimistic update state for UI responsiveness
      parallelTransactionProcessor.createOptimisticUpdate(transaction.id);
      
      const parallelResult = await parallelTransactionProcessor.executeParallel(
        [
           {
            name: 'inventory_deduction',
            isCritical: false, // ✅ Non-critical - sale is sacrosanct, inventory issues queued for review
            timeout: 30000,
            execute: async () => {
              try {
                const deductionItems: DeductionItem[] = expandedItems.map(item => ({
                  productId: item.productId,
                  productName: item.name,
                  quantity: item.quantity
                }));

                // Use BATCHED inventory service for optimized performance
                const result = await BatchedAtomicInventoryService.deductInventoryAtomic({
                  transactionId: transaction.id,
                  storeId: transactionData.storeId,
                  items: deductionItems,
                  userId: transactionData.userId,
                  idempotencyKey: `txn-${transaction.id}-${Date.now()}`
                });

                // Return result object - never throw, just report status
                return { 
                  success: result.success, 
                  errors: result.errors || [],
                  message: result.success ? 'Inventory updated' : result.errors.join(', ')
                };
              } catch (inventoryError) {
                // Catch ALL errors and return as failed result - never throw
                console.error('⚠️ Inventory deduction error caught:', inventoryError);
                const errorMsg = inventoryError instanceof Error ? inventoryError.message : 'Unknown inventory error';
                return { success: false, errors: [errorMsg], message: errorMsg };
              }
            }
          },
          {
            name: 'bir_logging',
            isCritical: false, // Non-critical, won't cause rollback
            timeout: 5000, // 5 second timeout
            execute: async () => {
              return await this.logBIRCompliance(transaction, transactionData);
            }
          }
        ],
        transaction.id
      );

      // ✅ Handle inventory failures gracefully - queue for review instead of throwing
      const inventoryOperation = parallelResult.results.get('inventory_deduction');
      const inventoryResult = inventoryOperation?.result;
      const inventoryFailed = !inventoryResult?.success;
      
      if (inventoryFailed) {
        // Get error message from result.message, result.errors, or fallback
        const errorMsg = inventoryResult?.message || 
                        inventoryResult?.errors?.join(', ') || 
                        inventoryOperation?.error?.message || 
                        'Unknown inventory error';
        console.warn('⚠️ Inventory deduction failed - queuing for manual review:', errorMsg);
        
        // Queue failed inventory for manual review (non-blocking)
        this.queueFailedInventoryDeduction(
          transaction.id,
          transactionData.storeId,
          expandedItems,
          errorMsg
        ).catch(queueError => {
          console.error('Failed to queue inventory failure:', queueError);
        });
        
        // Show warning to staff but don't block transaction
        toast.warning('Transaction saved. Inventory update pending manual review.', {
          duration: 8000,
          description: errorMsg.substring(0, 100)
        });
      }

      // ✅ Log inventory status (success or queued for review)
      if (inventoryResult?.success) {
        console.log('✅ Inventory deduction completed successfully');
        toast.success('Transaction completed! Inventory updated.');
      } else {
        console.log('⚠️ Inventory deduction queued for manual review');
      }

      // Complete optimistic update
      parallelTransactionProcessor.completeOptimisticUpdate(transaction.id, {
        inventorySuccess: inventoryResult?.success || false,
        birLogged: !parallelResult.nonCriticalFailures.includes('bir_logging')
      });

      console.log('✅ [PHASE 3] Parallel operations completed', {
        inventoryDuration: parallelResult.results.get('inventory_deduction')?.duration.toFixed(2) + 'ms',
        birDuration: parallelResult.results.get('bir_logging')?.duration.toFixed(2) + 'ms',
        inventorySuccess: inventoryResult?.success,
        nonCriticalFailures: parallelResult.nonCriticalFailures
      });

      console.log('🎉 Transaction processing completed - returning transaction for printing');
      
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
      
      // Re-throw error to allow upstream handlers (like offline fallback) to catch it
      throw error;
    }
  }

  /**
   * Create the main transaction record
   */
  private async createTransactionRecord(data: StreamlinedTransactionData): Promise<Transaction | null> {
    // ✅ Guard against invalid transaction data
    if (data.total <= 0) {
      throw new Error('Invalid transaction: total amount must be greater than zero');
    }
    
    if (data.subtotal < 0) {
      throw new Error('Invalid transaction: subtotal cannot be negative');
    }
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Invalid transaction: must have at least one item');
    }

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
      senior_citizen_discount: data.discountType === 'senior' ? discountAmount : 
        (data.seniorDiscounts?.reduce((sum, s) => sum + s.discountAmount, 0) || 0),
      pwd_discount: data.discountType === 'pwd' ? discountAmount : 
        (data.otherDiscount?.type === 'pwd' ? data.otherDiscount.amount : 0),
      // Store the VAT amount correctly for BIR/RLC compliance
      vat_amount: vatAmount,
      sequence_number: parseInt(timestamp),
      terminal_id: 'TERMINAL-01',
      // Store detailed discount information
      senior_discounts_detail: data.seniorDiscounts ? JSON.stringify(data.seniorDiscounts) : null,
      other_discount_detail: data.otherDiscount ? JSON.stringify(data.otherDiscount) : null,
      vat_exemption_amount: data.vatExemption || 0
    };

    const { data: dbTransaction, error } = await supabase
      .from("transactions")
      .insert(transactionRecord)
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
      // Preserve original error details for better debugging
      const errorMsg = error.message || 'Database transaction insert failed';
      const enhancedError = new Error(errorMsg);
      // Attach original error for network detection
      (enhancedError as any).originalError = error;
      throw enhancedError;
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
        // Use BATCHED enrichment for optimized performance
        const enrichedItems = await batchEnrichCartItems(cartItems);
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
            // Use clean base product name for inventory matching
            const cleanName = extractBaseProductName(item.name);
            
            // Regular product
            basicItems.push({
              product_id: item.productId,
              variation_id: item.variationId || undefined,
              name: cleanName, // Store clean base name for inventory processing
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
   * Expand items for inventory deduction (OPTIMIZED - Single batched query)
   * Expands combo products into their components
   */
  private async expandItemsForInventory(items: StreamlinedTransactionItem[]): Promise<StreamlinedTransactionItem[]> {
    // Separate combo items and regular items
    const comboItems = items.filter(item => item.productId.startsWith('combo-'));
    const regularItems = items.filter(item => !item.productId.startsWith('combo-'));
    
    if (comboItems.length === 0) {
      return items; // No combos, return as-is
    }
    
    // Extract all component IDs from all combos in one pass
    const componentIdMap = new Map<string, StreamlinedTransactionItem>(); // componentId -> original combo item
    
    for (const item of comboItems) {
      const parts = item.productId.split('-');
      if (parts.length === 11) {
        const componentIds = [
          `${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}-${parts[5]}`,
          `${parts[6]}-${parts[7]}-${parts[8]}-${parts[9]}-${parts[10]}`
        ];
        
        componentIds.forEach(id => componentIdMap.set(id, item));
      }
    }
    
    const allComponentIds = Array.from(componentIdMap.keys());
    
    if (allComponentIds.length === 0) {
      console.warn('⚠️ No valid component IDs found in combo items');
      return items;
    }
    
    // ⚡ SINGLE BATCHED QUERY for all component products
    console.log(`⚡ Fetching ${allComponentIds.length} component products in single query`);
    const { data: products } = await supabase
      .from('product_catalog')
      .select('id, product_name')
      .in('id', allComponentIds);
    
    if (!products || products.length === 0) {
      console.warn('⚠️ No products found for combo components');
      return items;
    }
    
    // Create a product lookup map
    const productMap = new Map(products.map(p => [p.id, p]));
    
    // Expand each combo using the cached product data
    const expandedItems: StreamlinedTransactionItem[] = [...regularItems];
    
    for (const item of comboItems) {
      const parts = item.productId.split('-');
      if (parts.length === 11) {
        const componentIds = [
          `${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}-${parts[5]}`,
          `${parts[6]}-${parts[7]}-${parts[8]}-${parts[9]}-${parts[10]}`
        ];
        
        const components = componentIds
          .map(id => productMap.get(id))
          .filter((p): p is NonNullable<typeof p> => p !== undefined)
          .map(product => ({
            productId: product.id,
            name: product.product_name,
            quantity: item.quantity,
            unitPrice: 0,
            totalPrice: 0
          }));
        
        if (components.length > 0) {
          expandedItems.push(...components);
          console.log(`✅ Expanded combo: ${item.name} → ${components.map(c => c.name).join(', ')}`);
        }
      }
    }
    
    return expandedItems;
  }

  /**
   * Expand combo product for inventory processing
   * @deprecated - Use expandItemsForInventory() for batched processing
   */

  /**
   * Expand combo product for transaction processing
   */
  private async expandComboProductForTransaction(item: StreamlinedTransactionItem): Promise<DetailedTransactionItem[]> {
    try {
      // Extract component IDs from combo ID: "combo-{uuid1}-{uuid2}"
      const parts = item.productId.split('-');
      if (parts.length !== 11) { // combo + 5 parts for each UUID = 11 parts total
        throw new Error(`Invalid combo ID format: ${item.productId}. Expected format: combo-{uuid1}-{uuid2}`);
      }

      // Reconstruct the two UUIDs from the parts
      const componentIds = [
        `${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}-${parts[5]}`, // First UUID
        `${parts[6]}-${parts[7]}-${parts[8]}-${parts[9]}-${parts[10]}` // Second UUID
      ];

      // Validate that both parts are valid UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(componentIds[0]) || !uuidRegex.test(componentIds[1])) {
        throw new Error(`Invalid UUID format in combo ID: ${item.productId}`);
      }
      
      const croffleId = componentIds[0];
      const espressoId = componentIds[1];
      
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
   * Process recipe-based ingredients for Mix & Match products using recipe templates
   * Uses proper recipe templates with base ingredients + addon parsing
   */
  private async processRecipeBasedIngredients(
    item: StreamlinedTransactionItem,
    transactionItems: Array<{ product_id?: string; name: string; quantity: number; unit_price: number; total_price: number }>,
    processedIngredients: Set<string>,
    storeId: string
  ): Promise<void> {
    try {
      console.log(`  🔍 Processing recipe-based ingredients for: ${item.name}`);
      
      // Extract base product name for recipe template lookup
      let baseProductName = '';
      let addons: string[] = [];
      
      if (item.name.toLowerCase().includes(' with ')) {
        // Parse Mix & Match product: "Croffle Overload with Choco Flakes" → base: "Croffle Overload", addons: ["Choco Flakes"]
        const parts = item.name.split(' with ');
        baseProductName = parts[0].trim();
        addons = this.parseAddonsFromProductName(item.name);
        console.log(`  📋 Parsed Mix & Match - Base: "${baseProductName}", Addons:`, addons);
      } else {
        // Check if this is a standalone Mix & Match base product
        const itemName = item.name.toLowerCase();
        if (itemName.includes('croffle overload') || itemName.includes('mini croffle')) {
          baseProductName = item.name;
          console.log(`  📋 Standalone Mix & Match product: "${baseProductName}"`);
        } else {
          console.log(`  ⚠️ Not a Mix & Match product: ${item.name}`);
          return;
        }
      }

      // Look up recipe template for base product
      console.log(`  🔍 Looking up recipe template for: "${baseProductName}"`);
      const { data: recipeTemplate } = await supabase
        .from('recipe_templates')
        .select(`
          id,
          name,
          recipe_template_ingredients (
            ingredient_name,
            quantity,
            unit
          )
        `)
        .eq('name', baseProductName)
        .eq('is_active', true)
        .single();

      if (!recipeTemplate) {
        console.log(`  ⚠️ No recipe template found for: "${baseProductName}"`);
        return;
      }

      console.log(`  ✅ Found recipe template: ${recipeTemplate.name} with ${recipeTemplate.recipe_template_ingredients?.length || 0} ingredients`);

      // Add base recipe ingredients with Mix & Match logic
      if (recipeTemplate.recipe_template_ingredients) {
        for (const ingredient of recipeTemplate.recipe_template_ingredients) {
          const baseIngredientKey = `recipe_${ingredient.ingredient_name.replace(/\s+/g, '_')}`;
          if (!processedIngredients.has(baseIngredientKey)) {
            // Apply 0.5x deduction for Regular Croissant in Mix & Match orders (as per user requirement)
            let finalQuantity = ingredient.quantity * item.quantity;
            if (ingredient.ingredient_name === 'Regular Croissant') {
              finalQuantity = finalQuantity * 0.5; // 0.5x deduction for Mix & Match
              console.log(`  🎯 Mix & Match logic: ${ingredient.ingredient_name} quantity reduced to 0.5x (${finalQuantity})`);
            }
            
            transactionItems.push({
              product_id: undefined,
              name: ingredient.ingredient_name,
              quantity: finalQuantity,
              unit_price: 0,
              total_price: 0
            });
            processedIngredients.add(baseIngredientKey);
            console.log(`  ✅ Added recipe ingredient: ${ingredient.ingredient_name} (qty: ${finalQuantity} ${ingredient.unit})`);
          }
        }
      }

      // Add parsed addons to deduction items
      for (const addon of addons) {
        const addonKey = `addon_${addon}_${item.name}`;
        if (!processedIngredients.has(addonKey)) {
          transactionItems.push({
            product_id: undefined,
            name: addon,
            quantity: 1.0 * item.quantity, // 1x ratio for addons
            unit_price: 0,
            total_price: 0
          });
          processedIngredients.add(addonKey);
          console.log(`  ✅ Added addon ingredient: ${addon} (qty: ${1.0 * item.quantity})`);
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing recipe-based ingredients for ${item.name}:`, error);
      // Don't throw - preserve existing functionality even if processing fails
    }
  }

  /**
   * Parse specific addons from Mix & Match product names
   * e.g., "Croffle Overload with Choco Flakes and Caramel" → ["Choco Flakes", "Caramel"]
   */
  private parseAddonsFromProductName(productName: string): string[] {
    try {
      // Extract the part after "with"
      const withPart = productName.split(' with ')[1];
      if (!withPart) return [];

      // Split by "and" and clean up each addon name
      const addons = withPart
        .split(/\s+and\s+/i)
        .map(addon => addon.trim())
        .map(addon => {
          // Handle "Colored Sprinkles" specifically
          if (addon.toLowerCase().includes('colored sprinkles')) return 'Colored Sprinkles';
          if (addon.toLowerCase().includes('choco flakes')) return 'Choco Flakes';
          if (addon.toLowerCase().includes('caramel')) return 'Caramel';
          if (addon.toLowerCase().includes('chocolate')) return 'Chocolate';
          if (addon.toLowerCase().includes('marshmallow')) return 'Marshmallow';
          if (addon.toLowerCase().includes('peanut')) return 'Peanut';
          if (addon.toLowerCase().includes('tiramisu')) return 'Tiramisu';
          
          // Default: return as-is but capitalized
          return addon.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        })
        .filter(addon => addon.length > 0);

      return addons;
    } catch (error) {
      console.error(`❌ Error parsing addons from "${productName}":`, error);
      return [];
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
   * Rollback transaction on failure with inventory compensation
   */
  private async rollbackTransaction(transactionId: string): Promise<void> {
    try {
      console.log(`🔄 Rolling back transaction ${transactionId} with inventory compensation`);

      // ✅ NEW: Compensate inventory deductions first
      const compensationResult = await AtomicInventoryService.compensateDeduction(transactionId);
      if (compensationResult.success) {
        console.log(`✅ Restored inventory for ${compensationResult.itemsRestored} items`);
      } else {
        console.warn(`⚠️ Inventory compensation had errors:`, compensationResult.errors);
      }

      // Delete transaction items
      await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', transactionId);

      // Mark transaction as voided (don't delete for audit trail)
      await supabase
        .from('transactions')
        .update({ 
          status: 'voided',
          voided_at: new Date().toISOString(),
          voided_reason: 'Transaction failed - rolled back with inventory compensation'
        })
        .eq('id', transactionId);

      console.log('✅ Transaction rollback with inventory compensation completed');
    } catch (error) {
      console.error('❌ Transaction rollback failed:', error);
    }
  }
  /**
   * Check if a product is Mix & Match type (enhanced to handle standalone products)
   */
  private isMixAndMatchProduct(productName: string): boolean {
    const lowerName = productName.toLowerCase();
    return lowerName.includes(' with ') || 
           lowerName.includes('croffle overload') || 
           lowerName.includes('mini croffle');
  }

  /**
   * Queue failed inventory deduction for manual review
   * Ensures sale completes while inventory issues are tracked for later resolution
   */
  private async queueFailedInventoryDeduction(
    transactionId: string,
    storeId: string,
    items: StreamlinedTransactionItem[],
    errorMessage: string
  ): Promise<void> {
    try {
      // Use type assertion since table was just created and types may not be regenerated yet
      const { error } = await (supabase as any)
        .from('failed_inventory_queue')
        .insert({
          transaction_id: transactionId,
          store_id: storeId,
          items: JSON.stringify(items),
          error_message: errorMessage,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) {
        // If table doesn't exist, log to console for manual tracking
        console.error('⚠️ Failed to queue inventory failure (table may not exist):', error);
        console.error('MANUAL REVIEW NEEDED - Transaction:', transactionId);
        console.error('Items:', JSON.stringify(items));
        console.error('Error:', errorMessage);
        
        // Also log to error logger for visibility
        await transactionErrorLogger.logInventoryError(
          'inventory_queue_failed',
          new Error(`Failed to queue: ${error.message}. Original error: ${errorMessage}`),
          {
            storeId,
            transactionId,
            step: 'queue_failed_inventory',
            operationId: `queue_${Date.now()}`,
            itemCount: items.length,
            timestamp: new Date().toISOString()
          }
        );
      } else {
        console.log('✅ Inventory failure queued for manual review:', transactionId);
      }
    } catch (queueError) {
      // Non-blocking - just log the error
      console.error('❌ Failed to queue inventory deduction failure:', queueError);
    }
  }
}

export const streamlinedTransactionService = new StreamlinedTransactionService();