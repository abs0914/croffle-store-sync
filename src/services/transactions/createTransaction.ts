
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { BIRComplianceService } from "@/services/bir/birComplianceService";
import { toast } from "sonner";
import { format } from "date-fns";
import { enrichCartItemsWithCategories, insertTransactionItems } from "./transactionItemsService";
import { validateProductForSale } from "@/services/productCatalog/productValidationService";

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
    
    // Process inventory deduction with optimized strategy
    console.log('🔄 Starting inventory deduction for transaction:', data.id);
    try {
      let inventorySuccess = false;
      
      if (useBatchProcessing) {
        console.log('📦 Using batch inventory processing for large order');
        
        // Import batch processing service again for inventory
        const { BatchProcessingService } = await import('./batchProcessingService');
        
        inventorySuccess = await BatchProcessingService.batchProcessInventory(
          transaction.items,
          transaction.storeId,
          data.id,
          (progress) => {
            console.log(`📊 Inventory progress: ${progress.current}/${progress.total} - ${progress.message}`);
          }
        );
      } else {
        // Use sequential processing for small orders
        inventorySuccess = await updateInventoryStockForTransaction(transaction.items, transaction.storeId, data.id);
      }
      
      if (!inventorySuccess) {
        console.error('❌ Inventory deduction failed - rolling back transaction:', data.id);
        // Rollback transaction if inventory deduction fails
        await supabase.from("transactions").delete().eq("id", data.id);
        toast.error('Transaction failed - insufficient inventory');
        return null;
      }
      console.log('✅ Inventory deduction completed successfully for transaction:', data.id);
    } catch (inventoryError) {
      console.error('❌ Critical inventory error:', inventoryError);
      // Rollback transaction for critical errors
      await supabase.from("transactions").delete().eq("id", data.id);
      toast.error('Transaction failed - inventory processing error');
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
    
    // Enhanced error reporting for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("📋 Transaction error details:", {
      error: errorMessage,
      storeId: transaction.storeId,
      userId: transaction.userId,
      itemCount: transaction.items.length,
      timestamp: new Date().toISOString()
    });
    
    // Show specific error message to user
    if (errorMessage.includes('permission denied')) {
      toast.error("Permission denied - please check user access rights");
    } else if (errorMessage.includes('inventory')) {
      toast.error("Inventory error - insufficient stock or processing failed");
    } else if (errorMessage.includes('validation')) {
      toast.error("Product validation failed - please check product setup");
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      toast.error("Network error - please check connection and try again");
    } else {
      toast.error(`Transaction failed: ${errorMessage}`);
    }
    
    return null;
  }
};

/**
 * Updates inventory stock after a transaction is completed using real inventory integration
 */
const updateInventoryStockForTransaction = async (items: any[], storeId: string, transactionId: string): Promise<boolean> => {
  try {
    console.log('Processing inventory deduction for transaction:', { transactionId, itemCount: items.length });

    // Import the actual inventory service
    const { processProductSale } = await import('@/services/productCatalog/inventoryIntegrationService');

    // Process each item through the proper inventory deduction service
    for (const item of items) {
      const success = await processProductSale(
        item.productId,
        item.quantity,
        transactionId,
        storeId
      );
      
      if (!success) {
        console.error(`Failed to process inventory for product: ${item.productId}`);
        return false;
      }
    }

    console.log('All inventory deductions completed successfully');
    return true;
  } catch (error) {
    console.error('Error in inventory deduction:', error);
    
    // Fallback to legacy product stock update for products without recipes
    try {
      await legacyProductStockUpdate(items);
      console.log('Fallback to legacy stock update completed');
      return true;
    } catch (fallbackError) {
      console.error('Legacy fallback also failed:', fallbackError);
      return false;
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
