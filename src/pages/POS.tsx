
import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useShift } from "@/contexts/shift"; 
import { useCart } from "@/contexts/cart/CartContext";
import { useProductCatalogData } from "@/hooks/useProductCatalogData";
import { useTransactionHandler } from "@/hooks/useTransactionHandler";
import { useAutomaticAvailability } from "@/hooks/useAutomaticAvailability";
import { realTimeNotificationService } from "@/services/notifications/realTimeNotificationService";

import POSContent from "@/components/pos/POSContent";
import CompletedTransaction from "@/components/pos/CompletedTransaction";
import OptimizedPOSHeader from "@/components/pos/OptimizedPOSHeader";
import { toast } from "sonner";
import { TransactionItem } from "@/types/transaction";

export default function POS() {
  const { currentStore } = useStore();
  const { currentShift } = useShift();
  const { items, subtotal, tax, total, addItem } = useCart();
  
  // Enhanced transaction handler with direct inventory integration
  const {
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
    handlePaymentComplete: processPayment,
    startNewSale
  } = useTransactionHandler(currentStore?.id || '');

  // Load product data from product_catalog using consolidated hook
  const {
    products,
    categories,
    isLoading,
    activeCategory,
    setActiveCategory,
    lastSync,
    isConnected
  } = useProductCatalogData(currentStore?.id || null);

  // Set up automatic availability monitoring
  useAutomaticAvailability(currentStore?.id || null, !!currentStore?.id);

  // Set up real-time notifications
  useEffect(() => {
    if (!currentStore?.id) return;

    const cleanup = realTimeNotificationService.setupRealTimeListeners(currentStore.id);
    return cleanup;
  }, [currentStore?.id]);

  
  // Check the product activation status - for debugging
  const activeProductsCount = products.filter(p => p.is_active).length;
  console.log(`POS: Total products: ${products.length}, Active products: ${activeProductsCount}`);
  
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
  
  // Wrapper for payment processing with inventory validation
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
      console.log("POS: Processing payment with enhanced inventory validation...");
      
    // Convert cart items to the format expected by the transaction handler
    const cartItemsForTransaction = items.map(item => ({
      ...item,
      id: item.productId,
      name: item.product?.name || 'Unknown Product'
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
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice
    }));

    // Convert CompletedTransaction to Transaction format for compatibility
    const transactionForReceipt = {
      ...completedTransaction,
      shiftId: currentShift?.id || '',
      storeId: currentStore?.id || '',
      userId: '',
      paymentMethod: completedTransaction.paymentMethod,
      status: 'completed' as const,
      createdAt: completedTransaction.createdAt,
      receiptNumber: completedTransaction.receiptNumber,
      items: transactionItems
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
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Optimized Consolidated Header */}
      <OptimizedPOSHeader
        currentStore={currentStore}
        currentShift={currentShift}
        selectedCustomer={selectedCustomer}
        isConnected={isConnected}
        lastSync={lastSync}
        storeId={currentStore?.id}
      />

      {/* Main POS Content */}
      <div className="flex-1 min-h-0 p-2 sm:p-4">
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
          seniorDiscounts={seniorDiscounts}
          otherDiscount={otherDiscount}
          handleApplyDiscount={handleApplyDiscount}
          handleApplyMultipleDiscounts={handleApplyMultipleDiscounts}
          handlePaymentComplete={handlePaymentComplete}
          addItemToCart={handleAddItemToCart}
          storeId={currentStore?.id}
        />
      </div>
    </div>
  );
}
