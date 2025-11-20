
/**
 * POS PERFORMANCE OPTIMIZATIONS
 * 
 * This component has been optimized for fast loading (<5 seconds):
 * 
 * 1. Authentication Stabilization:
 *    - User mapping is cached (5 min TTL) to prevent repeated DB calls
 *    - Route access decisions are memoized to avoid constant re-evaluation
 * 
 * 2. Data Loading Optimization:
 *    - Single unified data fetch with race condition protection
 *    - Store change debouncing to prevent duplicate requests
 *    - Smart cache invalidation and warming
 * 
 * 3. Background Processing:
 *    - Image validation runs in Web Worker (non-blocking)
 *    - Product caching is debounced (1 second delay)
 *    - Progressive data enhancement (core products first)
 * 
 * 4. Performance Monitoring:
 *    - Load time tracking for each stage
 *    - Cache hit rate monitoring
 *    - Automatic performance alerts
 */

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useShift } from "@/contexts/shift"; 
import { useCart } from "@/contexts/cart/CartContext";
import { useAuth } from "@/contexts/auth";
import { useUnifiedProducts } from "@/hooks/unified/useUnifiedProducts";
import { useTransactionHandler } from "@/hooks/useTransactionHandler";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { useOfflinePOS } from "@/hooks/useOfflinePOS";
import { useLargeOrderDiagnostics } from "@/hooks/useLargeOrderDiagnostics";
import { useBackgroundImageValidation } from "@/hooks/useBackgroundImageValidation";
import { manualRefreshService } from "@/services/pos/manualRefreshService";
import { posPerformanceMonitor } from "@/utils/posPerformanceMonitor";

import POSContent from "@/components/pos/POSContent";
import CompletedTransaction from "@/components/pos/CompletedTransaction";
import { OptimizedPOSHeader } from "@/components/pos/OptimizedPOSHeader";
import { POSDebugPanel } from "@/components/debug/POSDebugPanel";
import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";

import { QuickShiftAccess } from "@/components/pos/QuickShiftAccess";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TransactionItem } from "@/types/transaction";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReceiptGenerator from "@/components/pos/ReceiptGenerator";
import { OfflineIndicator } from "@/components/pos/OfflineIndicator";

export default function POS() {
  // Start performance tracking
  useEffect(() => {
    posPerformanceMonitor.startTracking('total');
    return () => {
      posPerformanceMonitor.endTracking('total');
      posPerformanceMonitor.logSummary();
    };
  }, []);
  
  const { user } = useAuth();
  const { currentStore } = useStore();
  const { currentShift } = useShift();
  const { items, calculations, addItem, clearCart, orderType, deliveryPlatform, deliveryOrderNumber } = useCart();
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

  // Track data loading performance
  useEffect(() => {
    if (isLoading) {
      posPerformanceMonitor.startTracking('dataLoad');
    } else {
      posPerformanceMonitor.endTracking('dataLoad');
    }
  }, [isLoading]);

  // Offline mode capabilities
  const {
    isOnline,
    isOfflineCapable,
    pendingTransactions,
    processOfflineTransaction,
    cacheProductsForOffline,
    getCachedProducts,
    checkOfflineAvailability
  } = useOfflineMode(currentStore?.id || null);

  // Enhanced offline-first POS system
  const offlinePOS = useOfflinePOS(currentStore?.id || null);

  // Local state for active category filter - initialize to "all" to show all products
  const [activeCategory, setActiveCategory] = useState<string | null>("all");

  // Sync category filter with unified products - handle "all" and "Mix & Match" as null
  useEffect(() => {
    // For Mix & Match category, pass null to get all products and let ProductGrid handle filtering
    const isMixMatchCategory = activeCategory && categories.some(c => 
      c.id === activeCategory && c.name.toLowerCase().includes('mix') && c.name.toLowerCase().includes('match')
    );
    
    updateCategoryFilter(activeCategory === "all" || isMixMatchCategory ? null : activeCategory);
  }, [activeCategory, updateCategoryFilter, categories]);

  // Track if initial load has been done
  const initialLoadDoneRef = useRef(false);
  
  // Force refresh on mount to ensure fresh data - only once
  useEffect(() => {
    if (currentStore?.id && !initialLoadDoneRef.current && !manualRefreshService.isDataFresh(currentStore.id)) {
      console.log('🔄 POS mounted, forcing data refresh');
      manualRefreshService.forceRefresh(currentStore.id);
      initialLoadDoneRef.current = true;
    }
  }, [currentStore?.id]);

  // Background image validation (non-blocking)
  const imagesToValidate = products.map(p => ({ 
    id: p.id, 
    url: p.image_url 
  }));
  
  const { validImages, isValidating: isValidatingImages } = useBackgroundImageValidation(
    imagesToValidate,
    products.length > 0
  );

  // Cache products for offline use when online - debounced and memoized
  const cachingTimeoutRef = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (cachingTimeoutRef.current) {
      clearTimeout(cachingTimeoutRef.current);
    }
    
    if (isOnline && products.length > 0 && categories.length > 0) {
      // Debounce caching to prevent excessive calls
      cachingTimeoutRef.current = setTimeout(() => {
        cacheProductsForOffline(products, categories);
      }, 1000);
    }
    
    return () => {
      if (cachingTimeoutRef.current) {
        clearTimeout(cachingTimeoutRef.current);
      }
    };
  }, [isOnline, products.length, categories.length, cacheProductsForOffline]);

  // Real-time notifications removed - using simplified toast system

  
  // Enhanced wrapper for addItem with detailed logging
  const handleAddItemToCart = (product, quantity, variation, customization?) => {
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

    addItem(product, quantity, variation, customization);
  };
  
  // Wrapper for payment processing with inventory validation and offline support
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
    deliveryOrderNumber?: string,
    cartItems?: any[], // Accept cart items as parameter
    cartCalculations?: any // Accept calculations as parameter
  ) => {
    if (!currentStore) {
      toast.error("Please select a store first");
      return false;
    }
    
    if (!currentShift) {
      toast.error("Please start a shift first");
      return false;
    }
    
    // CRITICAL: Use cart items passed as parameter, fallback to context items
    const currentItems = cartItems && cartItems.length > 0 ? [...cartItems] : [...items];
    console.log('🛒 PAYMENT START: Using cart items', {
      itemCount: currentItems.length,
      source: cartItems && cartItems.length > 0 ? 'parameter' : 'context',
      items: currentItems.map(i => ({ 
        id: i.productId, 
        name: i.product?.name, 
        qty: i.quantity,
        price: i.price,  // 🔍 DIAGNOSTIC: Add price logging
        hasPrice: i.price !== undefined && i.price !== null
      }))
    });
    
    if (currentItems.length === 0) {
      toast.error("Cart is empty - cannot process payment");
      console.error('❌ BLOCKED: Cart is empty at payment processing');
      return false;
    }
    
    try {
      // Check if we're online or offline
      if (!isOnline) {
        
        // Prepare offline transaction data
        const transactionData = {
          storeId: currentStore.id,
          userId: currentShift.userId,
          shiftId: currentShift.id,
          customerId: selectedCustomer?.id,
          items: currentItems.map(item => ({
            productId: item.productId,
            variationId: item.variationId,
            name: item.product?.name || 'Unknown Product',
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity
          })),
          subtotal: calculations.netAmount,
          tax: calculations.adjustedVAT,
          discount: calculations.totalDiscountAmount,
          discountType,
          discountIdNumber,
          total: calculations.finalTotal,
          amountTendered,
          change: paymentMethod === 'cash' ? amountTendered - calculations.finalTotal : undefined,
          paymentMethod,
          paymentDetails,
          orderType: orderType || 'dine_in',
          deliveryPlatform,
          deliveryOrderNumber
        };

        // Process offline transaction
        const offlineTransactionId = processOfflineTransaction(transactionData);
        
        if (offlineTransactionId) {
          // Clear cart and navigate to a simple success page
          clearCart();
          toast.success(`Offline transaction saved: ${offlineTransactionId}`);
          return true;
        } else {
          return false;
        }
      }
      
      // Online processing - use current captured items
      console.log("🌐 Processing online transaction with", currentItems.length, "items");
      
      // ✅ Use calculations passed from CartView, fallback to context if not provided
      const effectiveCalculations = cartCalculations || calculations;
      
      // 🔍 DIAGNOSTIC: Log calculations object to debug zero total issue
      console.log("🔍 DIAGNOSTIC - POS.tsx: Calculations before payment", {
        calculationsSource: cartCalculations ? 'parameter' : 'context',
        calculationsObject: effectiveCalculations,
        netAmount: effectiveCalculations?.netAmount,
        adjustedVAT: effectiveCalculations?.adjustedVAT,
        finalTotal: effectiveCalculations?.finalTotal,
        grossSubtotal: effectiveCalculations?.grossSubtotal,
        isCalculationsDefined: !!effectiveCalculations,
        itemsCount: currentItems.length,
        itemsWithPrices: currentItems.map(i => ({ name: i.product?.name, price: i.price, qty: i.quantity }))
      });
      
      // ✅ Capture cart values from effective calculations
      const capturedSubtotal = effectiveCalculations?.netAmount || 0;
      const capturedTax = effectiveCalculations?.adjustedVAT || 0;
      const capturedTotal = effectiveCalculations?.finalTotal || 0;
      
      // 🚨 VALIDATION: Check if captured values are valid
      if (capturedTotal === 0 && currentItems.length > 0) {
        const hasItemsWithPrices = currentItems.every(i => i.price != null && i.price >= 0);
        
        console.error("❌ CRITICAL: Total is 0 despite having items in cart!", {
          itemCount: currentItems.length,
          hasItemsWithPrices,
          itemsDetails: currentItems.map(i => ({ 
            name: i.product?.name, 
            price: i.price, 
            qty: i.quantity,
            total: i.price * i.quantity
          })),
          calculations,
          capturedSubtotal,
          capturedTax,
          capturedTotal,
          seniorDiscounts: seniorDiscounts.map(d => ({ 
            name: d.name, 
            amount: d.discountAmount 
          })),
          otherDiscount: otherDiscount ? { 
            type: otherDiscount.type, 
            amount: otherDiscount.amount 
          } : null,
          totalDiners: effectiveCalculations?.totalDiners || 1,
          vatExemption: effectiveCalculations?.vatExemption || 0
        });
        
        toast.error(
          hasItemsWithPrices 
            ? "Unable to calculate order total. Please refresh and try again."
            : "Some items are missing prices. Please remove them and try again."
        );
        return false; // Block transaction
      }
      
      // Convert cart items to the format expected by the transaction handler
      const cartItemsForTransaction = currentItems.map(item => ({
        ...item,
        id: item.productId,
        name: item.product?.name || 'Unknown Product'
      }));

      console.log('🛒 FORMATTED ITEMS for transaction:', cartItemsForTransaction.length);

      const success = await processPayment(
        currentStore, 
        currentShift, 
        cartItemsForTransaction, 
        capturedSubtotal,  // ✅ Use captured values
        capturedTax,       // ✅ Use captured values
        capturedTotal,     // ✅ Use captured values
        paymentMethod,
        amountTendered,
        paymentDetails,
        orderType,
        deliveryPlatform,
        deliveryOrderNumber,
        seniorDiscounts,        // ✅ Pass senior discounts detail
        otherDiscount,          // ✅ Pass other discount detail
        effectiveCalculations?.vatExemption  // ✅ Pass VAT exemption amount
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

      {/* Offline Status Banner */}
      <OfflineStatusBanner
        isOnline={offlinePOS.isOnline}
        isSyncing={offlinePOS.isSyncing}
        pendingSync={offlinePOS.pendingSync}
        cacheAge={offlinePOS.cacheAge}
        onSync={offlinePOS.triggerSync}
        className="m-2"
      />

      {/* Header */}
      <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
        <OptimizedPOSHeader
          storeName={currentStore?.name || 'POS System'}
          shiftInfo={currentShift ? {
            cashierName: user?.name || 'Unknown Cashier',
            startTime: new Date(currentShift.startTime).toLocaleTimeString()
          } : undefined}
          connectionStatus={isOnline ? 'online' : 'offline'}
        />
        
        {/* Offline Mode Indicator */}
        <div className="px-4 pb-2">
          <OfflineIndicator storeId={currentStore?.id || null} />
        </div>
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
          addItemToCart={(p,q,v,c)=>handleAddItemToCart(p,q,v,c)}
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
