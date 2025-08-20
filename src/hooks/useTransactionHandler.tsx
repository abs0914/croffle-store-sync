import { useState } from "react";
import { useCart } from "@/contexts/cart/CartContext";
import { Customer, Transaction } from "@/types";
import { createTransaction } from "@/services/transactions";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { SeniorDiscount as CartSeniorDiscount, OtherDiscount as CartOtherDiscount } from "@/services/cart/CartCalculationService";
import { BackgroundProcessingService } from "@/services/transactions/backgroundProcessingService";
import { PerformanceMonitor } from "@/services/performance/performanceMonitor";

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
    
    // Clear the old single discount state to prevent UI conflicts
    setDiscount(0);
    setDiscountType(undefined);
    setDiscountIdNumber(undefined);
    
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
  
  const [isProcessing, setIsProcessing] = useState(false);

  const processTransaction = async (transactionData: any) => {
    try {
      setIsProcessing(true);
      console.log('🚀 Starting transaction processing...', transactionData);

      // Import sync validator
      const { InventorySyncValidator } = await import('@/services/inventory/inventorySyncValidator');
      const syncValidator = InventorySyncValidator.getInstance();

      // Check if we can process sales based on sync health
      const syncCheck = await syncValidator.canProcessSale();
      if (!syncCheck.allowed) {
        throw new Error(`Sales temporarily disabled: ${syncCheck.reason}`);
      }

      // Validate items have required data
      if (!transactionData.items || transactionData.items.length === 0) {
        throw new Error('No items to process');
      }

      // Create transaction record first
      const transaction = await createTransaction(transactionData);
      console.log('✅ Transaction created:', transaction);

      if (!transaction?.id) {
        throw new Error('Failed to create transaction - no ID returned');
      }

      // Process inventory updates in background with enhanced error handling
      const jobId = await BackgroundProcessingService.processInventoryInBackground(
        transaction.id,
        transactionData.items,
        transactionData.storeId
      );

      console.log('🔄 Background inventory processing started:', jobId);

      // Add to retry queue if initial processing fails
      const { InventorySyncRetryService } = await import('@/services/inventory/inventorySyncRetryService');
      const retryService = InventorySyncRetryService.getInstance();

      // Monitor job completion and add to retry if needed
      const jobSuccess = await BackgroundProcessingService.waitForJob(jobId, 10000); // Wait max 10 seconds
      if (!jobSuccess) {
        console.warn('⚠️ Background job may have failed, adding to retry queue');
        await retryService.addRetryJob(
          transaction.id,
          transactionData.items,
          transactionData.storeId,
          'Initial background processing timeout or failure'
        );
      }

      // Update store metrics
      await BackgroundProcessingService.processAnalyticsInBackground({
        transactionId: transaction.id,
        storeId: transactionData.storeId,
        total: transactionData.total,
        itemCount: transactionData.items.length
      });

      return transaction;
    } catch (error) {
      console.error('❌ Transaction processing failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
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
    },
    orderType?: string,
    deliveryPlatform?: string,
    deliveryOrderNumber?: string
  ) => {
    if (!currentStore || !currentShift) {
      toast.error("No active store or shift found");
      return false;
    }
    
    // Start performance monitoring
    const operationId = `transaction_${Date.now()}`;
    PerformanceMonitor.startTimer(operationId);
    
    // Create transaction objects
    const transactionItems = items.map(item => ({
      productId: item.productId,
      variationId: item.variationId,
      name: item.variation ? `${item.product.name} (${item.variation.name})` : item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity
    }));
    
    // Adjust payment method for delivery orders
    let finalPaymentMethod = paymentMethod;
    let finalAmountTendered = amountTendered;
    let finalChange = paymentMethod === 'cash' ? amountTendered - (total - discount) : undefined;
    
    // For delivery orders, override payment method to reflect online payment
    if (orderType === 'online_delivery') {
      console.log('🚚 Processing delivery order, adjusting payment method');
      if (deliveryPlatform === 'grab_food') {
        finalPaymentMethod = 'e-wallet' as const;
        if (!paymentDetails?.eWalletProvider) {
          paymentDetails = { ...paymentDetails, eWalletProvider: 'Grab' };
        }
      } else if (deliveryPlatform === 'food_panda') {
        finalPaymentMethod = 'e-wallet' as const;
        if (!paymentDetails?.eWalletProvider) {
          paymentDetails = { ...paymentDetails, eWalletProvider: 'FoodPanda' };
        }
      } else {
        finalPaymentMethod = 'e-wallet' as const;
        if (!paymentDetails?.eWalletProvider) {
          paymentDetails = { ...paymentDetails, eWalletProvider: 'Online Payment' };
        }
      }
      
      // For delivery orders, amount tendered equals total (no cash handling)
      finalAmountTendered = total - discount;
      finalChange = undefined;
      
      console.log(`✅ Delivery payment method set to: ${finalPaymentMethod} via ${paymentDetails?.eWalletProvider}`);
    }
    
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
      amountTendered: finalAmountTendered,
      change: finalChange,
      paymentMethod: finalPaymentMethod,
      paymentDetails,
      status: 'completed',
      // Add delivery order information
      orderType: orderType as any,
      deliveryPlatform: deliveryPlatform as any,
      deliveryOrderNumber: deliveryOrderNumber
    };
    
    // Call the service to create the transaction with cart items for enrichment
    console.log("🔄 Creating transaction with enhanced error handling...", {
      itemCount: items.length,
      storeId: currentStore.id,
      total: transaction.total,
      paymentMethod: finalPaymentMethod
    });
    
    const result = await createTransaction(transaction, items);
    
    if (result) {
      console.log("🎯 Transaction created successfully, implementing optimistic navigation:", {
        transactionId: result.id,
        receiptNumber: result.receiptNumber,
        customer: selectedCustomer?.name || 'No customer'
      });
      
      // Clear the cart immediately for better UX
      clearCart();
      
      // Navigate immediately for optimistic UX (don't wait for inventory processing)
      console.log("🚀 Optimistic navigation to invoice page...");
      navigate(`/invoice/${result.id}`, {
        state: {
          transaction: result,
          customer: selectedCustomer
        },
        replace: true
      });
      
      // Process inventory updates in background for better performance
      const inventoryJobId = await BackgroundProcessingService.processInventoryInBackground(
        result.id,
        items,
        currentStore.id
      );
      
      // Process receipt generation in background
      const receiptJobId = await BackgroundProcessingService.processReceiptInBackground(result);
      
      // Process analytics in background
      const analyticsJobId = await BackgroundProcessingService.processAnalyticsInBackground({
        transactionId: result.id,
        storeId: currentStore.id,
        total: result.total,
        itemCount: items.length
      });
      
      // Show performance feedback with large order indication
      const isLargeOrder = items.length > 5;
      toast.success(`Transaction completed!${isLargeOrder ? ` (${items.length} items)` : ''} Background processing queued.`, {
        description: `Jobs: ${inventoryJobId?.slice(-8)}, ${receiptJobId?.slice(-8)}, ${analyticsJobId?.slice(-8)}`
      });
      
      console.log(`📋 Background jobs queued:`, {
        inventory: inventoryJobId,
        receipt: receiptJobId,
        analytics: analyticsJobId
      });
      
      console.log("✅ Optimistic transaction flow completed");
      
      // Record performance metrics
      PerformanceMonitor.endTimer(
        operationId,
        'full_transaction_flow',
        {
          itemCount: items.length,
          paymentMethod: finalPaymentMethod,
          total: total - discount,
          backgroundJobs: 3
        }
      );
      
      return true;
    } else {
      // Enhanced error handling for failed transactions
      const isLargeOrder = items.length > 5;
      const errorMsg = `Transaction creation failed${isLargeOrder ? ` (${items.length} items)` : ''}`;
      
      console.log("❌ Transaction creation failed - detailed logging:", {
        itemCount: items.length,
        isLargeOrder,
        storeId: currentStore.id,
        shiftId: currentShift.id,
        total: transaction.total,
        paymentMethod: finalPaymentMethod
      });
      
      toast.error(isLargeOrder ? 
        `Failed to complete large order (${items.length} items). Please try smaller batches or contact support.` :
        'Transaction failed. Please try again.'
      );
      
      PerformanceMonitor.endTimer(operationId, 'transaction_failed', { 
        error: 'Transaction creation failed',
        itemCount: items.length,
        isLargeOrder 
      });
      
      return false;
    }
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