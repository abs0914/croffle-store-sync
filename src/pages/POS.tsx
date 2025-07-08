
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
import ActiveCashierDisplay from "@/components/pos/ActiveCashierDisplay";
import RealTimeSyncStatus from "@/components/pos/RealTimeSyncStatus";
import AvailabilityStatusBar from "@/components/pos/AvailabilityStatusBar";
import { toast } from "sonner";
import { TransactionItem } from "@/types/transaction";

export default function POS() {
  const { currentStore } = useStore();
  const { currentShift } = useShift();
  const { items, subtotal, tax, total, addItem } = useCart();
  
  // Transaction handler hook with store ID for inventory integration
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
      console.log("POS: Processing payment with inventory validation...");
      
      // Convert cart items to the format expected by the transaction handler
      const cartItemsForTransaction = items.map(item => ({
        ...item,
        id: item.productId,
        name: item.product.name
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
      name: item.product?.name || item.name,
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
      {/* Store and Cashier Info Header */}
      {(currentStore || currentShift?.cashier_id) && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            {currentStore && (
              <div className="flex items-center space-x-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{currentStore.name}</h2>
                  <p className="text-xs text-gray-500">{currentStore.address}</p>
                </div>
              </div>
            )}
            {currentShift?.cashier_id && (
              <ActiveCashierDisplay cashierId={currentShift.cashier_id} />
            )}
            {lastSync && (
              <RealTimeSyncStatus
                isConnected={isConnected}
                lastSync={lastSync}
                className="ml-4"
              />
            )}
          </div>
        </div>
      )}
      
      {/* Availability Status Bar */}
      {currentStore?.id && (
        <AvailabilityStatusBar
          storeId={currentStore.id}
          className="mx-4 mb-4"
        />
      )}

      {/* Main POS Content */}
      <div className="flex-1 min-h-0 p-4">
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
