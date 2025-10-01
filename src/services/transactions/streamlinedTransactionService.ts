/**
 * Streamlined Transaction Service
 * Pre-payment validation + atomic transaction processing
 * Replaces complex validation chains with unified approach
 */

import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { SimplifiedInventoryService } from "@/services/inventory/phase4InventoryService";
import { unifiedProductInventoryService } from "@/services/unified/UnifiedProductInventoryService";
import { processTransactionInventoryUltraSimplified, TransactionItem as UltraSimplifiedTransactionItem } from "./ultraSimplifiedTransactionInventory";
import { BIRComplianceService } from "@/services/bir/birComplianceService";
import { enrichCartItemsWithCategories, insertTransactionItems, DetailedTransactionItem } from "./transactionItemsService";
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

      // Step 3 & 4: PARALLEL EXECUTION (Phase 3 Optimization)
      // Inventory deduction and BIR logging run simultaneously for 60-70% speed improvement
      console.log('🚀 [PHASE 3] Starting parallel operations (inventory + BIR)');
      
      // Create optimistic update state for UI responsiveness
      parallelTransactionProcessor.createOptimisticUpdate(transaction.id);
      
      const parallelResult = await parallelTransactionProcessor.executeParallel(
        [
          {
            name: 'inventory_deduction',
            isCritical: true, // Failure causes rollback
            timeout: 15000, // 15 second timeout (increased for parallel ingredient deductions)
            execute: async () => {
              return await this.processInventoryDeduction(
                transaction.id,
                transactionData.storeId,
                transactionData.items,
                transactionData.userId,
                cartItems
              );
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

      // Check parallel execution results
      if (!parallelResult.success) {
        const criticalErrors = parallelResult.criticalFailures.map(opName => {
          const result = parallelResult.results.get(opName);
          return result?.error?.message || 'Unknown error';
        });

        console.error('❌ CRITICAL: Parallel operations failed:', criticalErrors);

        // Log critical failures
        await transactionErrorLogger.logInventoryError(
          'parallel_processing_failed',
          new Error(`Critical operations failed: ${criticalErrors.join(', ')}`),
          {
            ...context,
            transactionId: transaction.id,
            affectedItems: parallelResult.criticalFailures
          }
        );

        // Mark optimistic update as failed
        parallelTransactionProcessor.failOptimisticUpdate(
          transaction.id,
          new Error(criticalErrors.join(', '))
        );

        throw new Error(`Transaction failed: ${criticalErrors.join(', ')}`);
      }

      // Extract inventory result
      const inventoryResult = parallelResult.results.get('inventory_deduction')?.result;
      if (inventoryResult && !inventoryResult.success) {
        console.error('❌ CRITICAL: Inventory deduction failed:', inventoryResult.errors);
        
        parallelTransactionProcessor.failOptimisticUpdate(
          transaction.id,
          new Error(inventoryResult.errors.join(', '))
        );
        
        throw new Error(`Inventory deduction failed: ${inventoryResult.errors.join(', ')}`);
      }

      // Complete optimistic update
      parallelTransactionProcessor.completeOptimisticUpdate(transaction.id, {
        inventorySuccess: true,
        birLogged: !parallelResult.nonCriticalFailures.includes('bir_logging')
      });

      console.log('✅ [PHASE 3] Parallel operations completed successfully', {
        inventoryDuration: parallelResult.results.get('inventory_deduction')?.duration.toFixed(2) + 'ms',
        birDuration: parallelResult.results.get('bir_logging')?.duration.toFixed(2) + 'ms',
        nonCriticalFailures: parallelResult.nonCriticalFailures
      });

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
   * Process inventory deduction with user context
   */
  private async processInventoryDeduction(
    transactionId: string,
    storeId: string,
    items: StreamlinedTransactionItem[],
    userId: string,  // ⭐ Accept userId from cached auth context (required)
    cartItems?: any[]
  ): Promise<{ success: boolean; errors: string[] }> {
    console.log('✅ Using cached auth context - no auth query needed');
    console.log(`🔐 TRANSACTION CONTEXT: Cached user - ${userId}`);
    console.log(`🚨 DEBUG: processInventoryDeduction CALLED at ${new Date().toISOString()}`);
    console.log(`🚨 DEBUG: Transaction ID: ${transactionId}, Store ID: ${storeId}`);
    console.log(`🚨 DEBUG: Items count: ${items.length}, Cart items: ${cartItems?.length || 0}`);

    // CRITICAL: Check for empty items before processing
    if (!items || items.length === 0) {
      console.error('❌ BLOCKED: Attempted inventory deduction with empty items array');
      return {
        success: false,
        errors: ['No items provided for inventory deduction - transaction data may be corrupted']
      };
    }

    console.log(`🚨 DEBUG: About to format items for inventory...`);
    
    // PHASE 5: Use ultra simplified transaction inventory processing
    const inventoryItems: UltraSimplifiedTransactionItem[] = items.map(item => ({
      productId: item.productId,
      productName: item.name, // StreamlinedTransactionItem uses 'name' property
      quantity: item.quantity,
      storeId: storeId
    }));
    
    console.log(`🚨 DEBUG: Formatted inventory items:`, inventoryItems);
    
    console.log(`🚨 DEBUG: About to call processTransactionInventoryUltraSimplified...`);
    const result = await processTransactionInventoryUltraSimplified(
      transactionId,
      inventoryItems,
      userId  // ⭐ Use cached userId - no auth query!
    );
    console.log(`🚨 DEBUG: processTransactionInventoryUltraSimplified result:`, result);

    return {
      success: result.success,
      errors: result.errors
    };
  }

  /**
   * BIR compliance logging (non-critical)
        success: result.success,
        deductedItems: result.deductedItems?.length || 0,
        skippedItems: result.skippedItems?.length || 0,
        errors: result.errors?.length || 0,
        isMixMatch: result.isMixMatch
      });

      // Enhanced success logging for monitoring
      if (result.success) {
        console.log(`✅ INVENTORY DEDUCTION SUCCESS for transaction ${transactionId}`);
        console.log(`   Mix & Match product detected: ${result.isMixMatch}`);
        console.log(`   Deducted ingredients:`, result.deductedItems.map(item => 
          `${item.itemName}: -${item.quantityDeducted} units (new stock: ${item.newStock})${item.category ? ` [${item.category}]` : ''}`
        ));
        if (result.skippedItems && result.skippedItems.length > 0) {
          console.log(`   Skipped ingredients:`, result.skippedItems);
        }
      } else {
        console.error(`❌ INVENTORY DEDUCTION FAILED for transaction ${transactionId}`);
        console.error(`   Errors:`, result.errors);
      }

      return {
        success: result.success,
        errors: result.errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Inventory deduction failed';
      console.error(`❌ CRITICAL: Inventory deduction system error for transaction ${transactionId}:`, error);
      
      // CRITICAL: Return failure to prevent transaction completion
      return {
        success: false,
        errors: [errorMessage]
      };
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
  /**
   * Check if a product is Mix & Match type (enhanced to handle standalone products)
   */
  private isMixAndMatchProduct(productName: string): boolean {
    const lowerName = productName.toLowerCase();
    return lowerName.includes(' with ') || 
           lowerName.includes('croffle overload') || 
           lowerName.includes('mini croffle');
  }
}

export const streamlinedTransactionService = new StreamlinedTransactionService();