
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/contexts/cart/types";
import { Store } from "@/types";
import { ShiftType } from "@/types";
import { Customer } from "@/types";
import { usePOSInventoryValidation } from "@/hooks/pos/usePOSInventoryValidation";
import { useCart } from "@/contexts/cart/CartContext";

export interface SeniorDiscount {
  id: string;
  idNumber: string;
  name: string;
  discountAmount: number;
}

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
  senior_discounts?: SeniorDiscount[];
  other_discount?: {
    type: string;
    amount: number;
    idNumber?: string;
  };
}

export const useTransactionHandler = (storeId: string) => {
  const [completedTransaction, setCompletedTransaction] = useState<CompletedTransaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [seniorDiscounts, setSeniorDiscounts] = useState<SeniorDiscount[]>([]);
  const [otherDiscount, setOtherDiscount] = useState<{ type: 'pwd' | 'employee' | 'loyalty' | 'promo', amount: number, idNumber?: string } | null>(null);
  const [totalDiners, setTotalDiners] = useState(1);
  
  // Legacy discount fields for backward compatibility
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | ''>('');
  const [discountIdNumber, setDiscountIdNumber] = useState<string>('');

  const { validateCartItems, processCartInventoryDeduction } = usePOSInventoryValidation(storeId);
  const { applyDiscounts } = useCart();

  const handleApplyMultipleDiscounts = useCallback((
    newSeniorDiscounts: SeniorDiscount[], 
    newOtherDiscount?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo', amount: number, idNumber?: string },
    newTotalDiners: number = 1
  ) => {
    setSeniorDiscounts(newSeniorDiscounts);
    setOtherDiscount(newOtherDiscount || null);
    setTotalDiners(newTotalDiners);
    
    // Synchronize with cart context for proper calculation display
    applyDiscounts(
      newSeniorDiscounts,
      newOtherDiscount || null,
      newTotalDiners
    );
    
    // Calculate total discount for legacy compatibility
    const totalSeniorDiscount = newSeniorDiscounts.reduce((sum, d) => sum + d.discountAmount, 0);
    const totalOtherDiscount = newOtherDiscount?.amount || 0;
    setDiscount(totalSeniorDiscount + totalOtherDiscount);
    
    // Set primary discount type for legacy compatibility
    if (newSeniorDiscounts.length > 0) {
      setDiscountType('senior');
      setDiscountIdNumber(newSeniorDiscounts[0].idNumber);
    } else if (newOtherDiscount) {
      setDiscountType(newOtherDiscount.type);
      setDiscountIdNumber(newOtherDiscount.idNumber || '');
    } else {
      setDiscountType('');
      setDiscountIdNumber('');
    }
  }, [applyDiscounts]);

  // Legacy function for backward compatibility
  const handleApplyDiscount = useCallback((
    discountAmount: number, 
    type: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo', 
    idNumber: string
  ) => {
    if (type === 'senior') {
      const seniorDiscount: SeniorDiscount = {
        id: `senior-${Date.now()}`,
        idNumber,
        name: 'Senior Citizen',
        discountAmount
      };
      handleApplyMultipleDiscounts([seniorDiscount]);
    } else {
      handleApplyMultipleDiscounts([], { type: type as any, amount: discountAmount, idNumber });
    }
  }, [handleApplyMultipleDiscounts]);

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

      // Calculate separate discount amounts for BIR compliance
      const totalSeniorDiscount = seniorDiscounts.reduce((sum, d) => sum + d.discountAmount, 0);
      const totalPwdDiscount = otherDiscount?.type === 'pwd' ? otherDiscount.amount : 0;

      // Step 2: Create transaction record
      console.log("Creating transaction with user:", user.id, "store:", store.id);
      
      const transactionData = {
        receipt_number: receiptNumber,
        customer_id: selectedCustomer?.id || null,
        store_id: store.id,
        user_id: user.id,
        shift_id: shift.id,
        items: JSON.stringify(items),
        subtotal: Number(subtotal),
        tax: Number(tax),
        discount: Number(discount),
        total: Number(total),
        payment_method: paymentMethod,
        amount_tendered: Number(amountTendered),
        change: Number(change),
        discount_type: discountType || null,
        discount_id_number: discountIdNumber || null,
        senior_citizen_discount: totalSeniorDiscount || 0,
        pwd_discount: totalPwdDiscount || 0,
        senior_discounts: seniorDiscounts.length > 0 ? JSON.stringify(seniorDiscounts) : null,
        discount_details: (seniorDiscounts.length > 0 || otherDiscount) ? JSON.stringify({
          senior_discounts: seniorDiscounts,
          other_discount: otherDiscount
        }) : null,
        payment_details: paymentDetails ? JSON.stringify(paymentDetails) : null,
        status: 'completed'
      };

      console.log("Transaction data:", transactionData);
      
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData)
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
        created_at: transaction.created_at,
        senior_discounts: seniorDiscounts,
        other_discount: otherDiscount
      });

      toast.success("Transaction completed successfully!");
      return true;
      
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error(`Failed to complete transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [selectedCustomer, discount, discountType, discountIdNumber, seniorDiscounts, otherDiscount, validateCartItems, processCartInventoryDeduction]);

  const startNewSale = useCallback(() => {
    setCompletedTransaction(null);
    setSelectedCustomer(null);
    setSeniorDiscounts([]);
    setOtherDiscount(null);
    setTotalDiners(1);
    setDiscount(0);
    setDiscountType('');
    setDiscountIdNumber('');
    
    // Reset cart discounts too
    applyDiscounts([], null, 1);
  }, [applyDiscounts]);

  return {
    completedTransaction,
    selectedCustomer,
    setSelectedCustomer,
    discount,
    discountType,
    discountIdNumber,
    seniorDiscounts,
    otherDiscount,
    totalDiners,
    handleApplyDiscount,
    handleApplyMultipleDiscounts,
    handlePaymentComplete,
    startNewSale
  };
};
