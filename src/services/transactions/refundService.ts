import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefundData, RefundedItem, RefundEligibility } from "@/types/refund";

/**
 * Generate a unique refund receipt number
 */
export const generateRefundReceiptNumber = async (storeId: string): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get count of refunds today
  const { count } = await supabase
    .from('refunds')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .gte('created_at', today.toISOString().slice(0, 10));
  
  const sequenceNum = ((count || 0) + 1).toString().padStart(4, '0');
  return `REF-${dateStr}-${sequenceNum}`;
};

/**
 * Check if a transaction is eligible for refund
 */
export const checkRefundEligibility = async (
  transactionId: string,
  storeId: string
): Promise<RefundEligibility> => {
  try {
    // Fetch the original transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      return { eligible: false, reason: 'Transaction not found' };
    }

    // Check if transaction belongs to this store
    if (transaction.store_id !== storeId) {
      return { eligible: false, reason: 'Transaction does not belong to this store' };
    }

    // Check if transaction is already voided
    if (transaction.status === 'voided') {
      return { eligible: false, reason: 'Transaction has already been voided' };
    }

    // Check for existing refunds
    const { data: existingRefunds } = await supabase
      .from('refunds')
      .select('*')
      .eq('original_transaction_id', transactionId);

    const totalRefunded = (existingRefunds || []).reduce(
      (sum, r) => sum + Number(r.refund_amount), 
      0
    );

    // Check if fully refunded
    if (totalRefunded >= Number(transaction.total)) {
      return { 
        eligible: false, 
        reason: 'Transaction has already been fully refunded',
        originalTransaction: transaction,
        existingRefunds,
        totalRefundedAmount: totalRefunded,
        remainingRefundable: 0
      };
    }

    return {
      eligible: true,
      originalTransaction: transaction,
      existingRefunds,
      totalRefundedAmount: totalRefunded,
      remainingRefundable: Number(transaction.total) - totalRefunded
    };
  } catch (error) {
    console.error('Error checking refund eligibility:', error);
    return { eligible: false, reason: 'Error checking eligibility' };
  }
};

/**
 * Find transaction by receipt number
 */
export const findTransactionByReceiptNumber = async (
  receiptNumber: string,
  storeId: string
) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('store_id', storeId)
    .eq('receipt_number', receiptNumber)
    .single();

  if (error) {
    console.error('Error finding transaction:', error);
    return null;
  }

  return data;
};

/**
 * Process a refund
 */
export const processRefund = async (
  refundData: RefundData
): Promise<{ success: boolean; refundId?: string; receiptNumber?: string; error?: string }> => {
  try {
    console.log('🔄 Processing refund:', refundData);

    // Generate refund receipt number
    const refundReceiptNumber = await generateRefundReceiptNumber(refundData.storeId);

    // Calculate VAT for refund (12% VAT)
    const refundVatAmount = refundData.refundAmount * 0.12 / 1.12;

    // Prepare items for database
    const itemsReturnedToStock = refundData.refundedItems.filter(item => item.returnToStock && !item.isDamaged);
    const itemsDamaged = refundData.refundedItems.filter(item => item.isDamaged);

    // Insert refund record using raw query to bypass type checking for new table
    const { data: refund, error: refundError } = await supabase
      .from('refunds' as any)
      .insert({
        store_id: refundData.storeId,
        original_transaction_id: refundData.originalTransactionId,
        original_receipt_number: refundData.originalReceiptNumber,
        refund_receipt_number: refundReceiptNumber,
        refund_type: refundData.refundType,
        refund_reason_category: refundData.refundReasonCategory,
        refund_reason: refundData.refundReason,
        refund_notes: refundData.refundNotes,
        refunded_items: refundData.refundedItems,
        original_transaction_total: refundData.originalTransactionTotal,
        refund_amount: refundData.refundAmount,
        refund_vat_amount: refundVatAmount,
        refund_method: refundData.refundMethod,
        refund_method_details: refundData.refundMethodDetails,
        items_returned_to_stock: itemsReturnedToStock,
        items_damaged: itemsDamaged,
        processed_by_user_id: refundData.processedByUserId,
        processed_by_name: refundData.processedByName,
        authorized_by_user_id: refundData.authorizedByUserId,
        authorized_by_name: refundData.authorizedByName,
        terminal_id: refundData.terminalId || 'POS-001',
        shift_id: refundData.shiftId,
        refund_date: new Date().toISOString()
      } as any)
      .select()
      .single();

    if (refundError) {
      console.error('Error creating refund:', refundError);
      return { success: false, error: refundError.message };
    }

    // Handle inventory restoration for items returned to stock
    // Note: For refunds, we need to restore inventory directly since we don't have the original transaction deductions
    if (itemsReturnedToStock.length > 0) {
      for (const item of itemsReturnedToStock) {
        try {
          // Manually restore inventory by adding quantity back
          const { data: inventoryItem } = await supabase
            .from('inventory_stock')
            .select('id, stock_quantity')
            .eq('store_id', refundData.storeId)
            .ilike('item', `%${item.productName}%`)
            .eq('is_active', true)
            .single();

          if (inventoryItem) {
            await supabase
              .from('inventory_stock')
              .update({ 
                stock_quantity: Number(inventoryItem.stock_quantity) + item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', inventoryItem.id);
            
            console.log(`✅ Restored ${item.quantity} of ${item.productName} to inventory`);
          }
        } catch (inventoryError) {
          console.error(`Failed to restore inventory for ${item.productName}:`, inventoryError);
          // Log but don't fail the refund
        }
      }
    }

    toast.success(`Refund processed: ${refundReceiptNumber}`);
    
    return { 
      success: true, 
      refundId: (refund as any)?.id,
      receiptNumber: refundReceiptNumber 
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    return { success: false, error: 'Failed to process refund' };
  }
};

/**
 * Get refunds for a store within a date range
 */
export const getRefunds = async (
  storeId: string,
  startDate?: string,
  endDate?: string
) => {
  let query = supabase
    .from('refunds')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('refund_date', startDate);
  }
  if (endDate) {
    query = query.lte('refund_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching refunds:', error);
    return [];
  }

  return data;
};

/**
 * Get refund totals for reporting
 */
export const getRefundTotals = async (
  storeId: string,
  startDate: string,
  endDate: string
) => {
  const { data, error } = await supabase
    .from('refunds')
    .select('refund_amount, refund_vat_amount')
    .eq('store_id', storeId)
    .gte('refund_date', startDate)
    .lte('refund_date', endDate);

  if (error) {
    console.error('Error fetching refund totals:', error);
    return { totalAmount: 0, totalVat: 0, count: 0 };
  }

  return {
    totalAmount: data.reduce((sum, r) => sum + Number(r.refund_amount || 0), 0),
    totalVat: data.reduce((sum, r) => sum + Number(r.refund_vat_amount || 0), 0),
    count: data.length
  };
};

/**
 * Get refunds for a specific shift
 */
export const getShiftRefunds = async (shiftId: string) => {
  const { data, error } = await supabase
    .from('refunds')
    .select('*')
    .eq('shift_id', shiftId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shift refunds:', error);
    return [];
  }

  return data;
};
