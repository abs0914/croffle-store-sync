import { useState } from "react";
import { useCart } from "@/contexts/cart/CartContext";
import { Customer, Transaction } from "@/types";
import { createTransaction } from "@/services/transactions";
import { toast } from "sonner";

export interface SeniorDiscount {
  id: string;
  idNumber: string;
  name: string;
  discountAmount: number;
  type?: 'senior' | 'pwd';
  amount?: number;
}

export function useTransactionHandler(storeId: string) {
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | undefined>(undefined);
  const [discountIdNumber, setDiscountIdNumber] = useState<string | undefined>(undefined);
  const [seniorDiscounts, setSeniorDiscounts] = useState<SeniorDiscount[]>([]);
  const [otherDiscount, setOtherDiscount] = useState<{ type: 'pwd' | 'employee' | 'loyalty' | 'promo', amount: number, idNumber?: string } | undefined>(undefined);
  
  const { clearCart } = useCart();

  const handleApplyDiscount = (
    discountAmount: number, 
    type: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo',
    idNumber?: string
  ) => {
    setDiscount(discountAmount);
    setDiscountType(type);
    setDiscountIdNumber(idNumber);
  };

  const handleApplyMultipleDiscounts = (
    seniorDiscountsArray: SeniorDiscount[],
    otherDiscountValue?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo', amount: number, idNumber?: string }
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
    
    // Call the service to create the transaction
    const result = await createTransaction(transaction);
    
    if (result) {
      setCompletedTransaction(result);
      clearCart(); // Clear the cart after successful transaction
      return true;
    }
    
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