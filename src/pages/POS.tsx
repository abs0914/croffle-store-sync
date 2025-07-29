
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReceiptGenerator from "@/components/pos/ReceiptGenerator";

export default function POS() {
  const { currentStore } = useStore();
  const { currentShift } = useShift();
  const { items, subtotal, tax, total, addItem } = useCart();
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedTransaction, setLastCompletedTransaction] = useState<any>(null);
  const [lastTransactionCustomer, setLastTransactionCustomer] = useState<any>(null);
  
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
    allProducts, // Unfiltered products for combo dialog
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

  // Use useEffect to handle completed transaction state updates
  useEffect(() => {
    if (completedTransaction) {
      try {
        console.log("POS: Processing completed transaction:", {
          transaction: completedTransaction,
          hasReceiptNumber: !!completedTransaction.receiptNumber,
          hasItems: !!completedTransaction.items?.length,
          hasCreatedAt: !!completedTransaction.createdAt,
          selectedCustomer: selectedCustomer
        });

        // Validate required fields and handle errors asynchronously
        if (!completedTransaction.receiptNumber) {
          console.error("POS: Missing receipt number in completed transaction");
          toast.error("Error: Missing receipt number");
          setTimeout(() => startNewSale(), 100);
          return;
        }

        if (!completedTransaction.items || completedTransaction.items.length === 0) {
          console.error("POS: Missing items in completed transaction");
          toast.error("Error: Missing transaction items");
          setTimeout(() => startNewSale(), 100);
          return;
        }

        if (!completedTransaction.createdAt) {
          console.error("POS: Missing creation date in completed transaction");
          toast.error("Error: Missing transaction date");
          setTimeout(() => startNewSale(), 100);
          return;
        }

        // Convert CartItems to TransactionItems for the receipt with error handling
        const transactionItems: TransactionItem[] = completedTransaction.items.map((item, index) => {
          if (!item.name || !item.productId) {
            console.warn(`POS: Item ${index} missing required fields:`, item);
          }
          
          return {
            productId: item.productId || '',
            variationId: item.variationId || undefined,
            name: item.name || 'Unknown Item',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0
          };
        });

        // Convert CompletedTransaction to Transaction format for compatibility with safe defaults
        const transactionForReceipt = {
          ...completedTransaction,
          shiftId: currentShift?.id || '',
          storeId: currentStore?.id || '',
          userId: currentShift?.userId || '',
          paymentMethod: completedTransaction.paymentMethod || 'cash',
          status: 'completed' as const,
          createdAt: completedTransaction.createdAt,
          receiptNumber: completedTransaction.receiptNumber,
          items: transactionItems,
          // Ensure all numeric fields have defaults
          subtotal: completedTransaction.subtotal || 0,
          tax: completedTransaction.tax || 0,
          total: completedTransaction.total || 0,
          discount: completedTransaction.discount || 0,
          amountTendered: completedTransaction.amountTendered || 0,
          change: completedTransaction.change || 0
        };

        console.log("POS: Transaction converted for receipt:", transactionForReceipt);

        // Store last transaction for receipt viewing without causing re-renders
        setLastCompletedTransaction(transactionForReceipt);
        setLastTransactionCustomer(selectedCustomer);

      } catch (error) {
        console.error("POS: Error processing completed transaction:", error);
        toast.error("Error displaying receipt. Starting new sale.");
        setTimeout(() => startNewSale(), 100);
      }
    }
  }, [completedTransaction?.id]); // Only depend on transaction ID to prevent loops

  // If we have a completed transaction, show the receipt
  if (completedTransaction && lastCompletedTransaction) {
    return (
      <CompletedTransaction
        transaction={lastCompletedTransaction}
        customer={selectedCustomer}
        startNewSale={() => {
          console.log("POS: Starting new sale from completed transaction");
          startNewSale();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-background">
      {/* Header */}
      <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
        <OptimizedPOSHeader
          currentStore={currentStore}
          currentShift={currentShift}
          selectedCustomer={selectedCustomer}
          isConnected={isConnected}
          lastSync={lastSync}
          storeId={currentStore?.id}
          lastTransaction={lastCompletedTransaction}
          lastCustomer={lastTransactionCustomer}
          onViewReceipt={() => setShowReceiptModal(true)}
        />
      </div>

      {/* Main POS Content */}
      <div className="flex-1 min-h-0 p-3 md:p-4">
        <POSContent
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          products={products}
          allProducts={allProducts}
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

      {/* Receipt View Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Last Receipt</DialogTitle>
          </DialogHeader>
          {lastCompletedTransaction && (
            <ReceiptGenerator 
              transaction={lastCompletedTransaction}
              customer={lastTransactionCustomer}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
