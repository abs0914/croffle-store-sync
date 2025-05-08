
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useShift } from "@/contexts/shift"; 
import { useCart } from "@/contexts/CartContext";
import { useProductData } from "@/hooks/useProductData";
import { useTransactionHandler } from "@/hooks/useTransactionHandler";
import POSContent from "@/components/pos/POSContent";
import CompletedTransaction from "@/components/pos/CompletedTransaction";
import { toast } from "sonner";

export default function POS() {
  const { currentStore } = useStore();
  const { currentShift } = useShift();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { items, subtotal, tax, total } = useCart();
  
  // Transaction handler hook
  const {
    completedTransaction,
    selectedCustomer,
    setSelectedCustomer,
    discount,
    discountType,
    discountIdNumber,
    handleApplyDiscount,
    handlePaymentComplete: processPayment,
    startNewSale
  } = useTransactionHandler();

  // Load product data from database
  const { products, categories, isLoading } = useProductData(currentStore?.id || null);
  
  // Check the product activation status - for debugging
  const activeProductsCount = products.filter(p => p.isActive).length;
  console.log(`Total products: ${products.length}, Active products: ${activeProductsCount}`);
  
  // Wrapper for payment processing
  const handlePaymentComplete = async (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: {
      cardType?: string;
      cardNumber?: string;
      eWalletProvider?: string;
      eWalletReferenceNumber?: string;
    }
  ) => {
    if (!currentStore) {
      toast.error("Please select a store first");
      return;
    }
    
    if (!currentShift) {
      toast.error("Please start a shift first");
      return;
    }
    
    try {
      await processPayment(
        currentStore, 
        currentShift, 
        items, 
        subtotal, 
        tax, 
        total,
        paymentMethod,
        amountTendered,
        paymentDetails
      );
    } catch (error) {
      console.error("Payment processing failed:", error);
      toast.error("Failed to process payment");
    }
  };

  // If we have a completed transaction, show the receipt
  if (completedTransaction) {
    return (
      <CompletedTransaction
        transaction={completedTransaction}
        customer={selectedCustomer}
        startNewSale={startNewSale}
      />
    );
  }

  return (
    <POSContent
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      products={products}
      categories={categories}
      isLoading={isLoading}
      currentStore={currentStore}
      currentShift={currentShift}
      selectedCustomer={selectedCustomer}
      setSelectedCustomer={setSelectedCustomer}
      discount={discount}
      discountType={discountType}
      discountIdNumber={discountIdNumber}
      handleApplyDiscount={handleApplyDiscount}
      handlePaymentComplete={handlePaymentComplete}
    />
  );
}
