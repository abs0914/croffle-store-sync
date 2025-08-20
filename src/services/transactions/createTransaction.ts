
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { BIRComplianceService } from "@/services/bir/birComplianceService";
import { toast } from "sonner";
import { format } from "date-fns";
import { enrichCartItemsWithCategories, insertTransactionItems } from "./transactionItemsService";
import { validateProductForSale } from "@/services/productCatalog/productValidationService";
import { logInventorySyncSuccess, rollbackTransactionWithAudit } from "./transactionAuditService";
import { rollbackProcessedItems } from "./inventoryRollbackService";
import { startInventorySyncMonitoring, reportInventorySyncSuccess, reportInventorySyncFailure } from "../inventory/inventorySyncMonitor";

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

/**
 * Creates a new transaction in the database
 */
export const createTransaction = async (
  transaction: Omit<Transaction, "id" | "createdAt" | "receiptNumber">, 
  cartItems?: any[]
): Promise<Transaction | null> => {
  try {
    console.log('🔍 Pre-transaction validation for products...');
    
    // Import batch processing service
    const { BatchProcessingService } = await import('./batchProcessingService');
    
    // Determine processing strategy based on order size
    const itemCount = transaction.items.length;
    const useBatchProcessing = BatchProcessingService.shouldUseBatchProcessing(itemCount);
    
    if (useBatchProcessing) {
      console.log(`🔄 Using batch processing for large order (${itemCount} items)`);
      
      // Use batch validation for large orders
      const batchValidation = await BatchProcessingService.batchValidateProducts(
        transaction.items,
        (progress) => {
          console.log(`📊 Validation progress: ${progress.current}/${progress.total} - ${progress.message}`);
        }
      );
      
      if (!batchValidation.isValid) {
        const errorMessage = `Validation failed: ${batchValidation.errors.join(', ')}`;
        toast.error(errorMessage);
        console.error('❌ Batch validation failed:', batchValidation.errors);
        return null;
      }
    } else {
      // Use sequential validation for small orders
      for (const item of transaction.items) {
        console.log('🔍 Validating product for sale:', {
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        });
        
        const validation = await validateProductForSale(item.productId, item.quantity);
        console.log('✅ Product validation result:', validation);
        
        if (!validation.isValid) {
          console.error('❌ Product validation failed:', {
            productId: item.productId,
            productName: validation.productName,
            errors: validation.errors,
            lowStockIngredients: validation.lowStockIngredients,
            missingIngredients: validation.missingIngredients,
            fullValidation: validation
          });
          
          // Log the specific errors for debugging
          validation.errors.forEach((error, index) => {
            console.error(`❌ Validation Error ${index + 1}:`, error);
          });
          
          const errorMessage = `Cannot sell "${validation.productName}": ${validation.errors.join(', ')}`;
          if (validation.lowStockIngredients.length > 0) {
            toast.error(`${errorMessage}. Low stock: ${validation.lowStockIngredients.join(', ')}`);
          } else {
            toast.error(errorMessage);
          }
          console.error('❌ Product validation failed:', validation);
          return null;
        }
      }
    }
    
    console.log('✅ All products validated successfully');
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
    
    // Insert main transaction record
    const { data, error } = await supabase
      .from("transactions")
      .insert(newTransaction)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }

    // Insert detailed transaction items with category information
    if (cartItems && cartItems.length > 0) {
      try {
        const enrichedItems = await enrichCartItemsWithCategories(cartItems);
        await insertTransactionItems(data.id, enrichedItems);
      } catch (itemsError) {
        console.warn('Failed to insert enriched transaction items:', itemsError);
        // Don't fail the entire transaction for this
      }
    }
    
    toast.success("Transaction completed successfully");
    
    // Log BIR audit event
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
    
    // Enhanced inventory deduction with comprehensive error handling
    console.log('🔄 Starting inventory deduction for transaction:', data.id);
    console.log('🔄 Transaction items for inventory processing:', transaction.items.map(item => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity
    })));
    
    // Start monitoring for this transaction
    const { startInventorySyncMonitoring } = await import('@/services/inventory/inventorySyncMonitor');
    startInventorySyncMonitoring(data.id, transaction.storeId, transaction.items);
    
    try {
      let inventoryResult: { success: boolean; errors: string[] } = { success: false, errors: [] };
      
      if (useBatchProcessing) {
        console.log('📦 Using batch inventory processing for large order');
        
        // Import enhanced batch processing service
        const { EnhancedBatchProcessingService } = await import('./enhancedBatchProcessingService');
        
        inventoryResult = await EnhancedBatchProcessingService.batchProcessInventoryWithErrorHandling(
          transaction.items,
          transaction.storeId,
          data.id,
          (progress) => {
            console.log(`📊 Inventory progress: ${progress.current}/${progress.total} - ${progress.message}`);
          }
        );
      } else {
        // Use enhanced sequential processing with proper error tracking
        console.log('🔄 Processing inventory sequentially for', transaction.items.length, 'items');
        inventoryResult = await enhancedUpdateInventoryStockForTransaction(transaction.items, transaction.storeId, data.id);
      }
      
      if (!inventoryResult.success) {
        console.error('❌ Inventory deduction failed:', {
          transactionId: data.id,
          errors: inventoryResult.errors,
          itemsProcessed: transaction.items.length
        });
        
        // Report sync failure to monitoring
        const { reportInventorySyncFailure } = await import('@/services/inventory/inventorySyncMonitor');
        await reportInventorySyncFailure(data.id, transaction.storeId, inventoryResult.errors, transaction.items);
        
        // Enhanced rollback with audit logging
        await rollbackTransactionWithAudit(data.id, inventoryResult.errors, transaction.storeId, transaction.userId);
        
        // Provide detailed error message to user
        const errorMessage = inventoryResult.errors.length > 0 
          ? `Inventory error: ${inventoryResult.errors.slice(0, 2).join(', ')}${inventoryResult.errors.length > 2 ? '...' : ''}`
          : 'Insufficient inventory or processing error';
        
        toast.error(errorMessage);
        return null;
      }
      
      console.log('✅ Inventory deduction completed successfully for transaction:', data.id);
      
      // Report sync success to monitoring
      const { reportInventorySyncSuccess } = await import('@/services/inventory/inventorySyncMonitor');
      reportInventorySyncSuccess(data.id);
      
      // Log successful inventory sync for monitoring
      await logInventorySyncSuccess(data.id, transaction.items.length, transaction.storeId);
      
    } catch (inventoryError) {
      console.error('❌ Critical inventory processing error:', {
        error: inventoryError,
        transactionId: data.id,
        storeId: transaction.storeId,
        itemCount: transaction.items.length,
        timestamp: new Date().toISOString()
      });
      
      // Report critical failure to monitoring
      const { reportInventorySyncFailure } = await import('@/services/inventory/inventorySyncMonitor');
      await reportInventorySyncFailure(
        data.id, 
        transaction.storeId, 
        [`Critical error: ${inventoryError instanceof Error ? inventoryError.message : String(inventoryError)}`], 
        transaction.items
      );
      
      // Enhanced rollback with comprehensive error logging
      await rollbackTransactionWithAudit(
        data.id, 
        [`Critical error: ${inventoryError instanceof Error ? inventoryError.message : String(inventoryError)}`], 
        transaction.storeId, 
        transaction.userId
      );
      
      toast.error('Transaction failed - critical inventory processing error');
      return null;
    }
    
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
    const isLargeOrder = transaction.items.length > 5;
    
    console.error("📋 Transaction error details:", {
      error: errorMessage,
      storeId: transaction.storeId,
      userId: transaction.userId,
      itemCount: transaction.items.length,
      isLargeOrder,
      timestamp: new Date().toISOString(),
      items: transaction.items.map(item => ({ name: item.name, quantity: item.quantity }))
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
 * Enhanced inventory stock update with comprehensive error tracking and rollback
 */
const enhancedUpdateInventoryStockForTransaction = async (
  items: any[], 
  storeId: string, 
  transactionId: string
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = [];
  const processedItems: { productId: string; name: string; quantity: number }[] = [];
  
  try {
    console.log('🔍 Enhanced inventory processing for transaction:', { 
      transactionId, 
      itemCount: items.length, 
      storeId 
    });
    
    console.log('🔍 Items to process:', items.map(item => ({ 
      productId: item.productId, 
      name: item.name, 
      quantity: item.quantity 
    })));

    // Import the actual inventory service
    const { processProductSale } = await import('@/services/productCatalog/inventoryIntegrationService');

    // Process each item with enhanced error tracking
    for (const item of items) {
      try {
        console.log(`🔍 Processing item: ${item.name} (${item.productId}) - Qty: ${item.quantity}`);
        
        const success = await processProductSale(
          item.productId,
          item.quantity,
          transactionId,
          storeId
        );
        
        if (!success) {
          const errorMsg = `Failed to process inventory for ${item.name} (${item.productId})`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        } else {
          console.log(`✅ Successfully processed inventory for: ${item.name}`);
          processedItems.push({ 
            productId: item.productId, 
            name: item.name, 
            quantity: item.quantity 
          });
        }
      } catch (itemError) {
        const errorMsg = `Critical error processing ${item.name}: ${itemError instanceof Error ? itemError.message : String(itemError)}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // If any items failed, rollback processed items
    if (errors.length > 0) {
      console.error('❌ Inventory processing failed - attempting rollback of processed items');
      
      if (processedItems.length > 0) {
        try {
          await rollbackProcessedItems(processedItems, transactionId);
          console.log('✅ Rollback completed for processed items');
        } catch (rollbackError) {
          console.error('❌ Rollback failed:', rollbackError);
          errors.push(`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
        }
      }
      
      return { success: false, errors };
    }

    console.log('✅ All inventory deductions completed successfully');
    return { success: true, errors: [] };
    
  } catch (error) {
    const criticalError = `Critical inventory processing error: ${error instanceof Error ? error.message : String(error)}`;
    console.error('❌ Critical error in enhanced inventory processing:', error);
    
    // Attempt rollback of any processed items
    if (processedItems.length > 0) {
      try {
        await rollbackProcessedItems(processedItems, transactionId);
        console.log('✅ Emergency rollback completed');
      } catch (rollbackError) {
        console.error('❌ Emergency rollback failed:', rollbackError);
        errors.push(`Emergency rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
      }
    }
    
    // Try legacy fallback as last resort
    try {
      console.log('🔄 Attempting legacy fallback for inventory update');
      await legacyProductStockUpdate(items);
      console.log('✅ Legacy fallback completed successfully');
      return { success: true, errors: [`Used legacy fallback due to: ${criticalError}`] };
    } catch (fallbackError) {
      console.error('❌ Legacy fallback also failed:', fallbackError);
      errors.push(criticalError);
      errors.push(`Legacy fallback failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      return { success: false, errors };
    }
  }
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
