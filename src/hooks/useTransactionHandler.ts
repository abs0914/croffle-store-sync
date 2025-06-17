
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/contexts/cart/types";
import { Store } from "@/types";
import { Shift } from "@/contexts/shift/types";
import { Customer } from "@/types";
import { createInventoryMovement } from "@/services/storeInventory/inventoryMovementService";

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

export const useTransactionHandler = () => {
  const [completedTransaction, setCompletedTransaction] = useState<CompletedTransaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | ''>('');
  const [discountIdNumber, setDiscountIdNumber] = useState<string>('');

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
    shift: Shift,
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
      console.log("Starting transaction processing...");
      
      const receiptNumber = generateReceiptNumber();
      const change = paymentMethod === 'cash' ? Math.max(0, amountTendered - total) : 0;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create transaction record
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

      // Process inventory deductions for each item
      for (const item of items) {
        try {
          // Get current inventory stock for this item
          const { data: inventoryItems, error: inventoryError } = await supabase
            .from('inventory_stock')
            .select('*')
            .eq('store_id', store.id)
            .eq('item', item.name)
            .eq('is_active', true);

          if (inventoryError) {
            console.warn(`Error fetching inventory for ${item.name}:`, inventoryError);
            continue;
          }

          if (inventoryItems && inventoryItems.length > 0) {
            const inventoryItem = inventoryItems[0];
            const newQuantity = Math.max(0, inventoryItem.stock_quantity - item.quantity);
            
            // Update inventory stock
            const { error: updateError } = await supabase
              .from('inventory_stock')
              .update({ 
                stock_quantity: newQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', inventoryItem.id);

            if (updateError) {
              console.warn(`Error updating inventory for ${item.name}:`, updateError);
              continue;
            }

            // Log inventory movement
            await createInventoryMovement({
              inventory_stock_id: inventoryItem.id,
              movement_type: 'sale',
              quantity_change: -item.quantity,
              previous_quantity: inventoryItem.stock_quantity,
              new_quantity: newQuantity,
              reference_type: 'transaction',
              reference_id: transaction.id,
              notes: `Sale: ${item.name} (Receipt: ${receiptNumber})`
            });

            console.log(`Inventory updated for ${item.name}: ${inventoryItem.stock_quantity} -> ${newQuantity}`);
          } else {
            console.warn(`No inventory item found for ${item.name} in store ${store.name}`);
          }
        } catch (itemError) {
          console.error(`Error processing inventory for item ${item.name}:`, itemError);
        }
      }

      // Create inventory transactions for tracking
      const inventoryTransactions = items.map(item => ({
        store_id: store.id,
        product_id: item.id,
        variation_id: item.variation?.id || null,
        transaction_type: 'sale' as const,
        quantity: item.quantity,
        previous_quantity: 0,
        new_quantity: 0,
        reference_id: transaction.id,
        notes: `Sale transaction ${receiptNumber}`,
        created_by: user.id
      }));

      if (inventoryTransactions.length > 0) {
        const { error: inventoryError } = await supabase
          .from('inventory_transactions')
          .insert(inventoryTransactions);

        if (inventoryError) {
          console.warn("Error creating inventory transactions:", inventoryError);
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
      
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error("Failed to complete transaction. Please try again.");
      throw error;
    }
  }, [selectedCustomer, discount, discountType, discountIdNumber]);

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
