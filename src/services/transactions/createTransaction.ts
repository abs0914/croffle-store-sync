
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { BIRComplianceService } from "@/services/bir/birComplianceService";
import { toast } from "sonner";
import { format } from "date-fns";
import { enrichCartItemsWithCategories, insertTransactionItems } from "./transactionItemsService";
import { validateProductForSale } from "@/services/productCatalog/productValidationService";
import { logInventorySyncSuccess, rollbackTransactionWithAudit } from "./transactionAuditService";
// Removed rollbackProcessedItems - using simpleInventoryService only


// Type definition for transaction data from Supabase
interface TransactionRow {
  id: string;
  shift_id: string;
  store_id: string;
  user_id: string;
  customer_id?: string;
  items: string; // JSONB stored as string
  subtotal: number;
  tax: number;
  discount: number;
  discount_type?: string;
  discount_id_number?: string;
  total: number;
  amount_tendered?: number;
  change?: number;
  payment_method: string;
  payment_details?: object;
  status: 'completed' | 'voided';
  created_at: string;
  receipt_number: string;
}

import { validateTransactionData, validateTransactionItemsStructure } from './transactionValidator';

/**
 * Creates a new transaction in the database
 */
export const createTransaction = async (
  transaction: Omit<Transaction, "id" | "createdAt" | "receiptNumber">, 
  cartItems?: any[]
): Promise<Transaction | null> => {
  try {
    console.log('🚀 Creating transaction - START', {
      storeId: transaction.storeId,
      userId: transaction.userId,
      itemCount: transaction.items.length,
      total: transaction.total,
      paymentMethod: transaction.paymentMethod,
      timestamp: new Date().toISOString()
    });
    
    // Validate transaction data structure
    if (!validateTransactionItemsStructure(transaction.items)) {
      toast.error('Invalid transaction items structure');
      return null;
    }

    // Validate transaction data against database
    const validation = await validateTransactionData(transaction.storeId, transaction.items);
    
    if (!validation.isValid) {
      const errorMessage = `Transaction validation failed: ${validation.errors.join(', ')}`;
      toast.error(errorMessage);
      console.error('❌ Transaction validation failed:', validation.errors);
      return null;
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Transaction validation warnings:', validation.warnings);
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    console.log('🔍 Using lightweight checkout validation...');
    
    // Use lightweight validation that trusts proactive validation
    const { quickCheckoutValidation } = await import('@/services/pos/lightweightValidationService');
    
    // Create simplified validation objects with all required Product fields
    const validationItems = transaction.items.map(item => ({
      productId: item.productId,
      product: { 
        id: item.productId,
        name: item.name,
        price: item.unitPrice,
        category_id: '',
        store_id: transaction.storeId,
        is_active: true,
        stock_quantity: 0,
        cost: 0,
        sku: `temp-${item.productId}`,
        description: '',
        image_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        recipe_id: null,
        product_type: 'direct' as const
      },
      quantity: item.quantity,
      price: item.unitPrice,
      variation: null,
      variationId: null
    }));
    
    const quickValidation = await quickCheckoutValidation(validationItems, transaction.storeId);
    
    if (!quickValidation.isValid && quickValidation.invalidProducts.length > 0) {
      const errorMessage = `Cannot process: ${quickValidation.invalidProducts.join(', ')}`;
      toast.error(errorMessage);
      console.error('❌ Quick validation failed:', quickValidation.invalidProducts);
      return null;
    }
    
    console.log('✅ Quick validation completed:', quickValidation.message);
    // Generate a receipt number based on date and time
    const now = new Date();
    const receiptPrefix = format(now, "yyyyMMdd");
    const timestamp = format(now, "HHmmss");
    
    // Optimized receipt number generation - avoid counting for performance
    const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const receiptNumber = `${receiptPrefix}-${randomSuffix}-${timestamp}`;
    
    // Use timestamp-based sequence for better performance
    const sequenceNumber = parseInt(timestamp);
    
    // Calculate BIR-compliant VAT breakdown (12% standard rate)
    const grossAmount = transaction.subtotal;
    const discountAmount = transaction.discount || 0;
    const netAmount = grossAmount - discountAmount;
    
    // VAT calculation: Net amount is inclusive of 12% VAT
    const vatableSales = netAmount / 1.12; // Amount before VAT
    const vatAmount = netAmount - vatableSales; // 12% VAT portion
    
    // Discount breakdown for BIR compliance
    const seniorDiscount = transaction.discountType === 'senior' ? discountAmount : 0;
    const pwdDiscount = transaction.discountType === 'pwd' ? discountAmount : 0;
    const employeeDiscount = transaction.discountType === 'employee' ? discountAmount : 0;
    
    // VAT-exempt and zero-rated sales (can be enhanced based on item classification)
    const vatExemptSales = seniorDiscount + pwdDiscount; // Senior/PWD discounts are VAT-exempt
    const zeroRatedSales = 0; // For export sales or zero-rated items
    
    // Handle promo details for SM Accreditation
    let promoReference = null;
    let promoDetails = null;
    
    // Check if transaction has promo information (can be expanded later)
    if (transaction.customerId && transaction.discountType === 'loyalty') {
      promoReference = 'LOYALTY001';
      promoDetails = 'LOYALTY001=Loyalty Program Discount';
    }
    
    const newTransaction = {
      shift_id: transaction.shiftId,
      store_id: transaction.storeId,
      user_id: transaction.userId,
      customer_id: transaction.customerId,
      items: JSON.stringify(transaction.items),
      subtotal: transaction.subtotal,
      tax: transaction.tax,
      discount: transaction.discount,
      discount_type: transaction.discountType,
      discount_id_number: transaction.discountIdNumber,
      total: transaction.total,
      amount_tendered: transaction.amountTendered,
      change: transaction.change,
      payment_method: transaction.paymentMethod,
      payment_details: transaction.paymentDetails ? transaction.paymentDetails : null,
      status: transaction.status,
      receipt_number: receiptNumber,
      created_at: now.toISOString(),
      // Delivery platform fields
      order_type: transaction.orderType || 'dine_in',
      delivery_platform: transaction.deliveryPlatform,
      delivery_order_number: transaction.deliveryOrderNumber,
      // BIR Compliance fields - Updated with proper calculations
      vat_sales: vatableSales,
      vat_exempt_sales: vatExemptSales,
      zero_rated_sales: zeroRatedSales,
      senior_citizen_discount: seniorDiscount,
      pwd_discount: pwdDiscount,
      sequence_number: Number(sequenceNumber),
      terminal_id: 'TERMINAL-01',
      promo_reference: promoReference,
      promo_details: promoDetails
    };
    
    console.log('💾 Inserting transaction to database', {
      receiptNumber,
      sequenceNumber,
      timestamp: now.toISOString()
    });
    
    // Insert main transaction record
    const { data, error } = await supabase
      .from("transactions")
      .insert(newTransaction)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database insert error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        receiptNumber
      });
      throw new Error(error.message);
    }
    
    console.log('✅ Transaction inserted successfully', {
      transactionId: data.id,
      receiptNumber: data.receipt_number
    });

    // Insert detailed transaction items with category information (CRITICAL: Always save transaction items)
    console.log('💾 Ensuring transaction items are saved for audit trail...');
    
    if (cartItems && cartItems.length > 0) {
      try {
        const enrichedItems = await enrichCartItemsWithCategories(cartItems);
        await insertTransactionItems(data.id, enrichedItems);
        console.log(`✅ Transaction items saved: ${enrichedItems.length} items`);
      } catch (itemsError) {
        console.error('❌ CRITICAL: Failed to insert transaction items:', itemsError);
        // This is critical - transaction items must be saved for audit purposes
        toast.error('Failed to save transaction items - rolling back transaction');
        
        // Rollback the transaction
        await supabase.from('transactions').delete().eq('id', data.id);
        return null;
      }
    } else {
      // Fallback: create basic transaction items from transaction.items
      try {
        const basicItems = transaction.items.map(item => ({
          product_id: item.productId,
          variation_id: item.variationId || undefined,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice || (item.unitPrice * item.quantity),
          category_id: undefined,
          category_name: 'Unknown',
          product_type: 'direct'
        }));
        
        await insertTransactionItems(data.id, basicItems);
        console.log(`✅ Basic transaction items saved: ${basicItems.length} items`);
      } catch (itemsError) {
        console.error('❌ CRITICAL: Failed to insert basic transaction items:', itemsError);
        toast.error('Failed to save transaction items - rolling back transaction');
        
        // Rollback the transaction
        await supabase.from('transactions').delete().eq('id', data.id);
        return null;
      }
    }

    // Process inventory deduction using the simple service
    console.log('🔄 Processing inventory deduction...');
    
    try {
      const { deductInventoryForTransaction } = await import('@/services/inventory/simpleInventoryService');
      
      const inventoryItems = transaction.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));
      
      const deductionResult = await deductInventoryForTransaction(
        data.id,
        transaction.storeId,
        inventoryItems
      );
      
      if (deductionResult.success) {
        console.log(`✅ Inventory deduction completed: ${deductionResult.deductedItems.length} items deducted`);
      } else {
        console.warn(`⚠️ Inventory deduction failed: ${deductionResult.errors.join(', ')}`);
        // Don't fail the transaction for inventory issues - show warning instead
        toast.warning(`Transaction completed but inventory deduction failed: ${deductionResult.errors.join(', ')}`);
      }
    } catch (inventoryError) {
      console.error('❌ Inventory deduction error:', inventoryError);
      // Don't fail the transaction for inventory issues
      toast.warning(`Transaction completed but inventory processing failed: ${inventoryError instanceof Error ? inventoryError.message : 'Unknown error'}`);
    }
    
    toast.success("Transaction completed successfully");
    
    // Log BIR audit event (optional - don't fail transaction if it fails)
    try {
      await BIRComplianceService.logAuditEvent(
        transaction.storeId,
        'transaction',
        'Transaction Completed',
        {
          receiptNumber,
          total: transaction.total,
          paymentMethod: transaction.paymentMethod,
          items: transaction.items.length
        },
        transaction.userId,
        undefined, // cashierName - can be enhanced
        'TERMINAL-01',
        data.id,
        receiptNumber
      );
    } catch (birError) {
      console.warn('BIR audit logging failed (non-critical):', birError);
      // Continue with transaction - don't fail for audit logging issues
    }
    
     // Log successful transaction creation - inventory will be handled by caller
      console.log('✅ Transaction created successfully - inventory processing delegated to caller');
    
    // Cast the returned data to our custom type
    const transactionData = data as unknown as TransactionRow;

    // Return formatted transaction data
    return {
      id: transactionData.id,
      shiftId: transactionData.shift_id,
      storeId: transactionData.store_id,
      userId: transactionData.user_id,
      customerId: transactionData.customer_id,
      items: JSON.parse(transactionData.items),
      subtotal: transactionData.subtotal,
      tax: transactionData.tax,
      discount: transactionData.discount,
      discountType: transactionData.discount_type as any,
      discountIdNumber: transactionData.discount_id_number,
      total: transactionData.total,
      amountTendered: transactionData.amount_tendered,
      change: transactionData.change,
      paymentMethod: transactionData.payment_method as 'cash' | 'card' | 'e-wallet',
      paymentDetails: transactionData.payment_details,
      status: transactionData.status,
      createdAt: transactionData.created_at,
      receiptNumber: transactionData.receipt_number
    };
  } catch (error) {
    console.error("❌ Critical transaction error:", error);
    
    // Enhanced error reporting for debugging large orders
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const isLargeOrder = transaction.items.length > 5;
    
    console.error("📋 Transaction error details:", {
      error: errorMessage,
      stack: errorStack,
      storeId: transaction.storeId,
      userId: transaction.userId,
      itemCount: transaction.items.length,
      isLargeOrder,
      timestamp: new Date().toISOString(),
      items: transaction.items.map(item => ({ name: item.name, quantity: item.quantity })),
      transactionData: {
        subtotal: transaction.subtotal,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        discountType: transaction.discountType
      }
    });
    
    // Show specific error message to user based on error type and order size
    if (errorMessage.includes('permission denied')) {
      toast.error("Permission denied - please check user access rights");
    } else if (errorMessage.includes('inventory')) {
      toast.error(`Inventory error - ${isLargeOrder ? 'Large order processing failed. ' : ''}Insufficient stock or processing failed`);
    } else if (errorMessage.includes('validation')) {
      toast.error(`Product validation failed - ${isLargeOrder ? 'Some items in large order invalid. ' : ''}Please check product setup`);
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      toast.error(`Network error - ${isLargeOrder ? 'Large order upload failed. ' : ''}Please check connection and try again`);
    } else if (errorMessage.includes('timeout')) {
      toast.error(`Transaction timeout - ${isLargeOrder ? 'Large order processing timed out. ' : ''}Please try again`);
    } else {
      toast.error(`Transaction failed: ${errorMessage}${isLargeOrder ? ' (Large order - 11 items)' : ''}`);
    }
    
    return null;
  }
};

/**
 * REMOVED: Enhanced inventory processing - now using simpleInventoryService only
 * This function has been replaced by the simpleInventoryService.deductInventoryForTransaction
 * to eliminate UUID casting errors and conflicting service calls
 */
const enhancedUpdateInventoryStockForTransaction = async (
  items: any[], 
  storeId: string, 
  transactionId: string
): Promise<{ success: boolean; errors: string[] }> => {
  console.log('⚠️ Enhanced inventory processing is disabled - use simpleInventoryService only');
  return { success: true, errors: ['Enhanced inventory service disabled - using simpleInventoryService'] };
};

/**
 * Legacy fallback for products without recipes
 */
const legacyProductStockUpdate = async (items: any[]) => {
  for (const item of items) {
    try {
      if (item.variationId) {
        // Update variation stock
        const { data: variation } = await supabase
          .from("product_variations")
          .select("stock_quantity")
          .eq("id", item.variationId)
          .single();
          
        if (variation) {
          await supabase
            .from("product_variations")
            .update({ stock_quantity: Math.max(0, variation.stock_quantity - item.quantity) })
            .eq("id", item.variationId);
        }
      } else {
        // Update product stock
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.productId)
          .single();
          
        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
            .eq("id", item.productId);
        }
      }
    } catch (error) {
      console.warn(`Failed to update stock for product ${item.productId}:`, error);
      // Continue processing other items
    }
  }
};
