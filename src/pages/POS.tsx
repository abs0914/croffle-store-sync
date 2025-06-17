
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useShift } from "@/contexts/shift"; 
import { useCart } from "@/contexts/cart/CartContext";
import { useProductData } from "@/hooks/useProductData";
import { useTransactionHandler } from "@/hooks/useTransactionHandler";
import POSContent from "@/components/pos/POSContent";
import CompletedTransaction from "@/components/pos/CompletedTransaction";
import { toast } from "sonner";
import { TransactionItem } from "@/types/transaction";

export default function POS() {
  const { currentStore } = useStore();
  const { currentShift } = useShift();
  const { items, subtotal, tax, total, addItem } = useCart();
  
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

  // Load product data using consolidated hook
  const { 
    products, 
    categories, 
    isLoading, 
    activeCategory, 
    setActiveCategory 
  } = useProductData(currentStore?.id || null);
  
  // Check the product activation status - for debugging
  const activeProductsCount = products.filter(p => p.is_active).length;
  console.log(`Total products: ${products.length}, Active products: ${activeProductsCount}`);
  
  // Enhanced wrapper for addItem with detailed logging
  const handleAddItemToCart = (product, quantity, variation) => {
    console.log("POS: handleAddItemToCart called with:", {
      product: product.name,
      productId: product.id,
      quantity,
      variation: variation ? variation.name : "none",
      currentStore: currentStore?.id,
      currentShift: currentShift?.id
    });
    
    if (!currentStore) {
      console.error("POS: No store selected");
      toast.error("Please select a store first");
      return;
    }
    
    if (!currentShift) {
      console.error("POS: No shift active");
      toast.error("Please start a shift first");
      return;
    }
    
    console.log("POS: Calling addItem from CartContext");
    addItem(product, quantity, variation);
  };
  
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
      // Convert cart items to the format expected by the transaction handler
      const cartItemsForTransaction = items.map(item => ({
        ...item,
        id: item.id,
        name: item.name
      }));

      await processPayment(
        currentStore, 
        currentShift, 
        cartItemsForTransaction, 
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
    // Convert CartItems to TransactionItems for the receipt
    const transactionItems: TransactionItem[] = completedTransaction.items.map(item => ({
      productId: item.productId,
      variationId: item.variationId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity
    }));

    // Convert CompletedTransaction to Transaction format for compatibility
    const transactionForReceipt = {
      ...completedTransaction,
      shiftId: currentShift?.id || '',
      storeId: currentStore?.id || '',
      userId: '',
      paymentMethod: completedTransaction.payment_method as 'cash' | 'card' | 'e-wallet',
      status: 'completed' as const,
      createdAt: completedTransaction.created_at,
      receiptNumber: completedTransaction.receipt_number,
      items: transactionItems // Use properly formatted TransactionItems
    };

    return (
      <CompletedTransaction
        transaction={transactionForReceipt}
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
      discountType={discountType as 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | undefined}
      discountIdNumber={discountIdNumber}
      handleApplyDiscount={handleApplyDiscount}
      handlePaymentComplete={handlePaymentComplete}
      addItemToCart={handleAddItemToCart}
    />
  );
}
