
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/contexts/cart/types";
import { Store } from "@/types";
import { ShiftType } from "@/types";
import { Customer } from "@/types";
import { usePOSInventoryValidation } from "@/hooks/pos/usePOSInventoryValidation";

export interface CompletedTransaction {
  id: string;
  receipt_number: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string;
  amount_tendered: number;
  change: number;
  created_at: string;
}

export const useTransactionHandler = (storeId: string) => {
  const [completedTransaction, setCompletedTransaction] = useState<CompletedTransaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | ''>('');
  const [discountIdNumber, setDiscountIdNumber] = useState<string>('');

  const { validateCartItems, processCartInventoryDeduction } = usePOSInventoryValidation(storeId);

  const handleApplyDiscount = useCallback((
    discountAmount: number, 
    type: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo', 
    idNumber: string
  ) => {
    setDiscount(discountAmount);
    setDiscountType(type);
    setDiscountIdNumber(idNumber);
  }, []);

  const generateReceiptNumber = () => {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-6);
    return `R${timestamp}`;
  };

  const handlePaymentComplete = useCallback(async (
    store: Store,
    shift: ShiftType,
    items: CartItem[],
    subtotal: number,
    tax: number,
    total: number,
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: {
      cardType?: string;
      cardNumber?: string;
      eWalletProvider?: string;
      eWalletReferenceNumber?: string;
    }
  ) => {
    try {
      console.log("Starting transaction processing with inventory validation...");
      
      // Step 1: Validate inventory availability
      const inventoryValid = await validateCartItems(items);
      if (!inventoryValid) {
        toast.error("Transaction cancelled due to insufficient inventory");
        return false;
      }

      const receiptNumber = generateReceiptNumber();
      const change = paymentMethod === 'cash' ? Math.max(0, amountTendered - total) : 0;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Step 2: Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          receipt_number: receiptNumber,
          customer_id: selectedCustomer?.id,
          store_id: store.id,
          user_id: user.id,
          shift_id: shift.id,
          items: JSON.stringify(items),
          subtotal,
          tax,
          discount,
          total,
          payment_method: paymentMethod,
          amount_tendered: amountTendered,
          change,
          discount_type: discountType || null,
          discount_id_number: discountIdNumber || null,
          payment_details: paymentDetails ? JSON.stringify(paymentDetails) : null,
          order_status: 'completed',
          status: 'completed'
        })
        .select()
        .single();

      if (transactionError) {
        console.error("Transaction creation error:", transactionError);
        throw transactionError;
      }

      console.log("Transaction created:", transaction);

      // Step 3: Process inventory deductions
      const inventorySuccess = await processCartInventoryDeduction(items, transaction.id);
      if (!inventorySuccess) {
        // Rollback transaction if inventory update fails
        await supabase
          .from('transactions')
          .update({ status: 'voided' })
          .eq('id', transaction.id);
        
        throw new Error("Failed to update inventory - transaction voided");
      }

      // Step 4: Create inventory transactions for audit trail
      const inventoryTransactions = items.map(item => ({
        store_id: store.id,
        product_id: item.productId,
        variation_id: item.variation?.id || null,
        transaction_type: 'sale' as const,
        quantity: item.quantity,
        previous_quantity: 0,
        new_quantity: 0,
        reference_id: transaction.id,
        notes: `POS Sale transaction ${receiptNumber}`,
        created_by: user.id
      }));

      if (inventoryTransactions.length > 0) {
        const { error: inventoryError } = await supabase
          .from('inventory_transactions')
          .insert(inventoryTransactions);

        if (inventoryError) {
          console.warn("Error creating inventory audit transactions:", inventoryError);
        }
      }

      setCompletedTransaction({
        id: transaction.id,
        receipt_number: receiptNumber,
        items,
        subtotal,
        tax,
        discount,
        total,
        payment_method: paymentMethod,
        amount_tendered: amountTendered,
        change,
        created_at: transaction.created_at
      });

      toast.success("Transaction completed successfully!");
      return true;
      
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error(`Failed to complete transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [selectedCustomer, discount, discountType, discountIdNumber, validateCartItems, processCartInventoryDeduction]);

  const startNewSale = useCallback(() => {
    setCompletedTransaction(null);
    setSelectedCustomer(null);
    setDiscount(0);
    setDiscountType('');
    setDiscountIdNumber('');
  }, []);

  return {
    completedTransaction,
    selectedCustomer,
    setSelectedCustomer,
    discount,
    discountType,
    discountIdNumber,
    handleApplyDiscount,
    handlePaymentComplete,
    startNewSale
  };
};
