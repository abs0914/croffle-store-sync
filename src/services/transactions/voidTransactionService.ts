import { supabase } from "@/integrations/supabase/client";
import { BIRComplianceService } from "@/services/bir/birComplianceService";
import { toast } from "sonner";

export interface VoidTransactionData {
  transactionId: string;
  reason: string;
  reasonCategory: 'mistake' | 'customer_request' | 'wrong_order' | 'system_error' | 'other';
  voidedBy: string;
  notes?: string;
}

/**
 * Voids a transaction - only allowed within same shift and same day
 */
export const voidTransaction = async (data: VoidTransactionData): Promise<boolean> => {
  try {
    console.log('🔄 Starting transaction void process:', data.transactionId);

    // First, get the transaction details
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', data.transactionId)
      .eq('status', 'completed')
      .single();

    if (fetchError || !transaction) {
      toast.error('Transaction not found or already voided');
      return false;
    }

    // Check if transaction is from today
    const transactionDate = new Date(transaction.created_at).toDateString();
    const todayDate = new Date().toDateString();
    
    if (transactionDate !== todayDate) {
      toast.error('Cannot void transactions from previous days');
      return false;
    }

    // Get current shift to verify same shift restriction
    const { data: currentShift } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', data.voidedBy)
      .eq('status', 'active')
      .single();

    if (!currentShift || currentShift.id !== transaction.shift_id) {
      toast.error('Can only void transactions from the current active shift');
      return false;
    }

    // Update transaction status to voided
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ 
        status: 'voided',
        updated_at: new Date().toISOString()
      })
      .eq('id', data.transactionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Create void audit record - log for now until audit table is properly integrated
    console.log('Void audit record:', {
      transaction_id: data.transactionId,
      voided_by: data.voidedBy,
      void_reason: data.reason,
      reason_category: data.reasonCategory,
      notes: data.notes,
      original_amount: transaction.total,
      voided_at: new Date().toISOString()
    });

    

    // Reverse inventory deductions
    try {
      await reverseInventoryDeductions(transaction);
    } catch (inventoryError) {
      console.error('Failed to reverse inventory:', inventoryError);
      // Continue with void process even if inventory reversal fails
    }

    // Log BIR audit event
    await BIRComplianceService.logAuditEvent(
      transaction.store_id,
      'transaction',
      'Transaction Voided',
      {
        originalReceiptNumber: transaction.receipt_number,
        voidReason: data.reason,
        reasonCategory: data.reasonCategory,
        originalAmount: transaction.total,
        notes: data.notes
      },
      data.voidedBy,
      undefined,
      transaction.terminal_id || 'TERMINAL-01',
      data.transactionId,
      transaction.receipt_number
    );

    toast.success('Transaction voided successfully');
    console.log('✅ Transaction void completed:', data.transactionId);
    return true;

  } catch (error) {
    console.error('❌ Transaction void failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Failed to void transaction: ${errorMessage}`);
    return false;
  }
};

/**
 * Reverses inventory deductions for a voided transaction
 */
const reverseInventoryDeductions = async (transaction: any) => {
  try {
    const items = JSON.parse(String(transaction.items));
    
    console.log('Processing inventory reversal for voided transaction:', {
      transactionId: transaction.id,
      itemCount: items.length
    });

    // For each item, we need to add back the quantity that was deducted
    for (const item of items) {
      try {
        // Import the inventory service to reverse the deductions
        const { processProductSale } = await import('@/services/productCatalog/inventoryIntegrationService');
        
        // We can't directly reverse, so we'll log the requirement for now
        // In a production system, you'd implement proper inventory reversal
        console.log(`Inventory reversal needed for item:`, {
          productId: item.productId,
          quantity: item.quantity,
          name: item.name
        });
        
        // TODO: Implement proper inventory reversal logic
        // This would typically involve adding back the quantities that were deducted
        
      } catch (itemError) {
        console.warn(`Failed to process inventory reversal for product ${item.productId}:`, itemError);
        // Continue with other items
      }
    }
  } catch (error) {
    console.error('Error in inventory reversal process:', error);
    // Don't throw to avoid blocking the void process
  }
};

/**
 * Gets transactions for current shift that can be voided
 */
export const getVoidableTransactions = async (shiftId: string, storeId: string) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customers (
          name,
          phone
        )
      `)
      .eq('shift_id', shiftId)
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching voidable transactions:', error);
    toast.error('Failed to load transactions');
    return [];
  }
};