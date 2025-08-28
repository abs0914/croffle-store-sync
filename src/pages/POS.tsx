
import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useShift } from "@/contexts/shift"; 
import { useCart } from "@/contexts/cart/CartContext";
import { useUnifiedProducts } from "@/hooks/unified/useUnifiedProducts";
import { useTransactionHandler } from "@/hooks/useTransactionHandler";
import { useLargeOrderDiagnostics } from "@/hooks/useLargeOrderDiagnostics";
import { manualRefreshService } from "@/services/pos/manualRefreshService";

import POSContent from "@/components/pos/POSContent";
import CompletedTransaction from "@/components/pos/CompletedTransaction";
import { OptimizedPOSHeader } from "@/components/pos/OptimizedPOSHeader";
import { POSDebugPanel } from "@/components/debug/POSDebugPanel";

import { QuickShiftAccess } from "@/components/pos/QuickShiftAccess";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TransactionItem } from "@/types/transaction";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReceiptGenerator from "@/components/pos/ReceiptGenerator";

export default function POS() {
  const { currentStore } = useStore();
  const { currentShift } = useShift();
  const { items, subtotal, tax, total, addItem, orderType, deliveryPlatform, deliveryOrderNumber } = useCart();
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

  // Large order diagnostics for debugging failures
  const { logOrderAttempt } = useLargeOrderDiagnostics();

  // Unified product and inventory data
  const {
    products,
    allProducts,
    categories,
    isLoading,
    error,
    isConnected,
    filters,
    updateCategoryFilter,
    refresh: refreshProducts
  } = useUnifiedProducts({
    storeId: currentStore?.id || null,
    autoRefresh: true
  });

  // Local state for active category filter - initialize to "all" to show all products
  const [activeCategory, setActiveCategory] = useState<string | null>("all");

  // Sync category filter with unified products - handle "all" as null
  useEffect(() => {
    updateCategoryFilter(activeCategory === "all" ? null : activeCategory);
  }, [activeCategory, updateCategoryFilter]);

  // Force refresh on mount to ensure fresh data
  useEffect(() => {
    if (currentStore?.id && !manualRefreshService.isDataFresh(currentStore.id)) {
      console.log('🔄 POS mounted, forcing data refresh');
      manualRefreshService.forceRefresh(currentStore.id);
    }
  }, [currentStore?.id]);

  // Real-time notifications removed - using simplified toast system

  
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
    },
    orderType?: string,
    deliveryPlatform?: string,
    deliveryOrderNumber?: string
  ) => {
    if (!currentStore) {
      toast.error("Please select a store first");
      return false;
    }
    
    if (!currentShift) {
      toast.error("Please start a shift first");
      return false;
    }
    
    try {
      console.log("POS: Processing payment with streamlined transaction service...");
      
      // Enhanced validation is now handled in CheckoutModal before payment begins
      // This provides a simpler, more reliable transaction flow
      
    // Convert cart items to the format expected by the transaction handler
    const cartItemsForTransaction = items.map(item => ({
      ...item,
      id: item.productId,
      name: item.product?.name || 'Unknown Product'
    }));

      const success = await processPayment(
        currentStore, 
        currentShift, 
        cartItemsForTransaction, 
        subtotal, 
        tax, 
        total,
        paymentMethod,
        amountTendered,
        paymentDetails,
        orderType,
        deliveryPlatform,
        deliveryOrderNumber
      );

      return success;
    } catch (error) {
      console.error("Payment processing failed:", error);
      toast.error("Failed to process payment");
      return false;
    }
  };

  // Note: Transaction completion now navigates to invoice page immediately
  // The completedTransaction handling is disabled to prevent interference with navigation
  
  // Store completed transaction for receipt modal only (when explicitly requested)
  useEffect(() => {
    if (completedTransaction && showReceiptModal) {
      console.log("POS: Processing completed transaction for receipt modal only");
      
      // Convert for receipt display only
      const transactionItems: TransactionItem[] = completedTransaction.items?.map((item, index) => ({
        productId: item.productId || '',
        variationId: item.variationId || undefined,
        name: item.name || 'Unknown Item',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0
      })) || [];

      const transactionForReceipt = {
        ...completedTransaction,
        shiftId: currentShift?.id || '',
        storeId: currentStore?.id || '',
        userId: currentShift?.userId || '',
        paymentMethod: completedTransaction.paymentMethod || 'cash',
        status: 'completed' as const,
        items: transactionItems,
        subtotal: completedTransaction.subtotal || 0,
        tax: completedTransaction.tax || 0,
        total: completedTransaction.total || 0,
        discount: completedTransaction.discount || 0,
        amountTendered: completedTransaction.amountTendered || 0,
        change: completedTransaction.change || 0
      };

      setLastCompletedTransaction(transactionForReceipt);
      setLastTransactionCustomer(selectedCustomer);
    }
  }, [completedTransaction?.id, showReceiptModal]); // Only process when receipt modal is requested

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-background">


      {/* Header */}
      <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
        <OptimizedPOSHeader
          storeName={currentStore?.name || 'POS System'}
          shiftInfo={currentShift ? {
            cashierName: currentShift.cashierName || 'Unknown Cashier',
            startTime: new Date(currentShift.startTime).toLocaleTimeString()
          } : undefined}
          connectionStatus={isConnected ? 'online' : 'offline'}
          onShowLastReceipt={() => setShowReceiptModal(true)}
          onRefreshProducts={refreshProducts}
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
          discountType={discountType as 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary' | undefined}
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

      {/* Debug Panel */}
      <POSDebugPanel />
    </div>
  );
}
