import { useState } from "react";
import { useCart } from "@/contexts/cart/CartContext";
import { Customer, Transaction } from "@/types";
import { createTransaction } from "@/services/transactions";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { SeniorDiscount as CartSeniorDiscount, OtherDiscount as CartOtherDiscount } from "@/services/cart/CartCalculationService";

export interface SeniorDiscount {
  id: string;
  idNumber: string;
  name: string;
  discountAmount: number;
  type?: 'senior' | 'pwd';
  amount?: number;
}

export function useTransactionHandler(storeId: string) {
  const navigate = useNavigate();
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary' | undefined>(undefined);
  const [discountIdNumber, setDiscountIdNumber] = useState<string | undefined>(undefined);
  const [seniorDiscounts, setSeniorDiscounts] = useState<SeniorDiscount[]>([]);
  const [otherDiscount, setOtherDiscount] = useState<{ type: 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary', amount: number, idNumber?: string, justification?: string } | undefined>(undefined);
  
  const { clearCart, applyDiscounts: applyCartDiscounts } = useCart();

  const handleApplyDiscount = (
    discountAmount: number, 
    type: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary',
    idNumber?: string,
    justification?: string
  ) => {
    // Update transaction handler state
    setDiscount(discountAmount);
    setDiscountType(type);
    setDiscountIdNumber(idNumber);
    
    // Sync with cart context to ensure calculations are updated
    if (type === 'senior') {
      // Convert single senior discount to multiple discount format
      const seniorDiscount: CartSeniorDiscount = {
        id: idNumber || 'single-senior',
        idNumber: idNumber || '',
        name: 'Senior Citizen',
        discountAmount: discountAmount
      };
      applyCartDiscounts([seniorDiscount], undefined, 1);
    } else {
      // Handle other discount types
      const otherDiscountData: CartOtherDiscount = {
        type: type as 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary',
        amount: discountAmount,
        idNumber: idNumber,
        justification: justification
      };
      applyCartDiscounts([], otherDiscountData, 1);
    }
  };

  const handleApplyMultipleDiscounts = (
    seniorDiscountsArray: SeniorDiscount[],
    otherDiscountValue?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary', amount: number, idNumber?: string, justification?: string }
  ) => {
    setSeniorDiscounts(seniorDiscountsArray);
    setOtherDiscount(otherDiscountValue);
    
    const totalSeniorDiscount = seniorDiscountsArray.reduce((sum, discount) => sum + (discount.amount || discount.discountAmount), 0);
    const totalOtherDiscount = otherDiscountValue?.amount || 0;
    const totalDiscount = totalSeniorDiscount + totalOtherDiscount;
    
    setDiscount(totalDiscount);
    if (seniorDiscountsArray.length > 0) {
      setDiscountType('senior');
      setDiscountIdNumber(seniorDiscountsArray[0].idNumber);
    } else if (otherDiscountValue) {
      setDiscountType(otherDiscountValue.type);
      setDiscountIdNumber(otherDiscountValue.idNumber);
    }
    
    // Sync with cart context - convert formats if needed
    const cartSeniorDiscounts: CartSeniorDiscount[] = seniorDiscountsArray.map(discount => ({
      id: discount.id,
      idNumber: discount.idNumber,
      name: discount.name,
      discountAmount: discount.discountAmount
    }));
    
    const cartOtherDiscount: CartOtherDiscount | undefined = otherDiscountValue ? {
      type: otherDiscountValue.type,
      amount: otherDiscountValue.amount,
      idNumber: otherDiscountValue.idNumber,
      justification: otherDiscountValue.justification
    } : undefined;
    
    // Calculate total diners based on senior discounts
    const totalDiners = Math.max(1, seniorDiscountsArray.length);
    
    applyCartDiscounts(cartSeniorDiscounts, cartOtherDiscount, totalDiners);
  };
  
  const handlePaymentComplete = async (
    currentStore: any,
    currentShift: any,
    items: any[],
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
    if (!currentStore || !currentShift) {
      toast.error("No active store or shift found");
      return;
    }
    
    // Create transaction objects
    const transactionItems = items.map(item => ({
      productId: item.productId,
      variationId: item.variationId,
      name: item.variation ? `${item.product.name} (${item.variation.name})` : item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity
    }));
    
    const transaction: Omit<Transaction, "id" | "createdAt" | "receiptNumber"> = {
      shiftId: currentShift.id,
      storeId: currentStore.id,
      userId: currentShift.userId,
      customerId: selectedCustomer?.id,
      customer: selectedCustomer || undefined,
      items: transactionItems,
      subtotal,
      tax,
      discount,
      discountType,
      discountIdNumber,
      total: total - discount,
      amountTendered,
      change: paymentMethod === 'cash' ? amountTendered - (total - discount) : undefined,
      paymentMethod,
      paymentDetails,
      status: 'completed'
    };
    
    // Call the service to create the transaction with cart items for enrichment
    const result = await createTransaction(transaction, items);
    
    if (result) {
      console.log("🎯 Transaction created successfully, navigating to invoice:", {
        transactionId: result.id,
        receiptNumber: result.receiptNumber,
        customer: selectedCustomer?.name || 'No customer'
      });
      
      clearCart(); // Clear the cart after successful transaction
      
      // Navigate immediately to invoice page with transaction data
      console.log("🧭 Navigating to invoice page...");
      navigate(`/invoice/${result.id}`, {
        state: {
          transaction: result,
          customer: selectedCustomer
        },
        replace: true
      });
      
      console.log("✅ Navigation call completed");
      return true;
    }
    
    console.log("❌ Transaction creation failed");
    return false;
  };
  
  const startNewSale = () => {
    setCompletedTransaction(null);
    setSelectedCustomer(null);
    setDiscount(0);
    setDiscountType(undefined);
    setDiscountIdNumber(undefined);
    setSeniorDiscounts([]);
    setOtherDiscount(undefined);
    // Clear cart will also clear discounts in cart context
    clearCart();
  };
  
  return {
    completedTransaction,
    selectedCustomer,
    setSelectedCustomer,
    discount,
    discountType,
    discountIdNumber,
    seniorDiscounts,
    otherDiscount,
    handleApplyDiscount,
    handleApplyMultipleDiscounts,
    handlePaymentComplete,
    startNewSale
  };
}