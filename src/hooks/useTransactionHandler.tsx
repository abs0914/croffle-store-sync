import { useState } from "react";
import { useCart } from "@/contexts/cart/CartContext";
import { useAuthSession } from "@/contexts/AuthSessionContext";
import { Customer, Transaction } from "@/types";
import { streamlinedTransactionService, StreamlinedTransactionData } from "@/services/transactions/streamlinedTransactionService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { SeniorDiscount as CartSeniorDiscount, OtherDiscount as CartOtherDiscount } from "@/services/cart/CartCalculationService";
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
  const { userId } = useAuthSession();  // ⭐ Use cached userId
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

  const processTransaction = async (transactionData: StreamlinedTransactionData) => {
    try {
      setIsProcessing(true);
      console.log('🚀 Using streamlined transaction processing...', transactionData);

      // Import sync validator
      const { InventorySyncValidator } = await import('@/services/inventory/inventorySyncValidator');
      const syncValidator = InventorySyncValidator.getInstance();

      // Check if we can process sales based on sync health
      const syncCheck = await syncValidator.canProcessSale();
      if (!syncCheck.allowed) {
        throw new Error(`Sales temporarily disabled: ${syncCheck.reason}`);
      }

      // Phase 1: Pre-payment validation
      const validation = await streamlinedTransactionService.validateBeforePayment(
        transactionData.storeId,
        transactionData.items
      );

      if (!validation.canProceed) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Phase 2: Process transaction with the streamlined service
      const transaction = await streamlinedTransactionService.processTransaction(transactionData);

      if (!transaction?.id) {
        throw new Error('Failed to create transaction - no ID returned');
      }

      console.log('✅ Streamlined transaction completed:', transaction.id);
      return transaction;
    } catch (error) {
      console.error('❌ Streamlined transaction processing failed:', error);
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
    deliveryOrderNumber?: string,
    seniorDiscountsParam?: SeniorDiscount[],
    otherDiscountParam?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary', amount: number, idNumber?: string, justification?: string },
    vatExemption?: number
  ) => {
    try {
      console.log('🎯 [TRANSACTION START] Payment processing initiated', {
        storeId: currentStore?.id,
        storeName: currentStore?.name,
        shiftId: currentShift?.id,
        userId: userId,
        itemCount: items.length,
        total: total,
        paymentMethod: paymentMethod,
        timestamp: new Date().toISOString()
      });

      if (!currentStore || !currentShift) {
        console.error('❌ [TRANSACTION BLOCKED] Missing store or shift', {
          hasStore: !!currentStore,
          hasShift: !!currentShift
        });
        toast.error("No active store or shift found");
        return false;
      }

      if (!userId) {
        console.error('❌ [TRANSACTION BLOCKED] Missing user ID');
        toast.error("Authentication required");
        return false;
      }

      if (items.length === 0) {
        console.error('❌ [TRANSACTION BLOCKED] No items in cart');
        toast.error("Cart is empty");
        return false;
      }
    } catch (error) {
      console.error('❌ [TRANSACTION ERROR] Initial validation failed:', error);
      toast.error('Transaction initialization failed');
      return false;
    }
    
    // Start performance monitoring
    const operationId = `transaction_${Date.now()}`;
    PerformanceMonitor.startTimer(operationId);
    
    // Create streamlined transaction items
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
    let finalChange = paymentMethod === 'cash' ? amountTendered - total : undefined;
    
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
      finalAmountTendered = total;
      finalChange = undefined;
      
      console.log(`✅ Delivery payment method set to: ${finalPaymentMethod} via ${paymentDetails?.eWalletProvider}`);
    }
    
    // ✅ Calculate discount values from the actual discount data being used
    const activeSeniorDiscounts = seniorDiscountsParam || seniorDiscounts;
    const activeOtherDiscount = otherDiscountParam || otherDiscount;
    
    const calculatedTotalDiscount = (
      activeSeniorDiscounts.reduce((sum, d) => sum + d.discountAmount, 0) +
      (activeOtherDiscount?.amount || 0)
    );

    // Determine the discount type based on what discounts are present
    const determinedDiscountType = (() => {
      if (activeSeniorDiscounts.length > 0) return 'senior';
      if (activeOtherDiscount) return activeOtherDiscount.type;
      return undefined;
    })();

    // Get the first ID number for backwards compatibility
    const determinedIdNumber = (() => {
      if (activeSeniorDiscounts.length > 0) return activeSeniorDiscounts[0].idNumber;
      if (activeOtherDiscount?.idNumber) return activeOtherDiscount.idNumber;
      return undefined;
    })();
    
    const streamlinedData: StreamlinedTransactionData = {
      storeId: currentStore.id,
      userId: userId,  // ⭐ Use cached userId
      shiftId: currentShift.id,
      customerId: selectedCustomer?.id,
      items: transactionItems,
      subtotal,
      tax,
      discount: calculatedTotalDiscount,  // ✅ Use calculated value
      discountType: determinedDiscountType,  // ✅ Use determined type
      discountIdNumber: determinedIdNumber,  // ✅ Use determined ID
      total: total,
      amountTendered: finalAmountTendered,
      change: finalChange,
      paymentMethod: finalPaymentMethod,
      paymentDetails,
      orderType: orderType as any,
      deliveryPlatform: deliveryPlatform as any,
      deliveryOrderNumber: deliveryOrderNumber,
      // Include detailed discount information
      seniorDiscounts: activeSeniorDiscounts,
      otherDiscount: activeOtherDiscount,
      vatExemption: vatExemption
    };
    
    // Use streamlined transaction service
    console.log("🔄 HANDLER - Using streamlined transaction processing...", {
      itemCount: items.length,
      storeId: currentStore.id,
      total: streamlinedData.total,
      paymentMethod: finalPaymentMethod,
      timestamp: new Date().toISOString(),
      operationId
    });
    
    let result;
    try {
      console.log('🚀 [CALLING SERVICE] About to call streamlinedTransactionService.processTransaction');
      result = await streamlinedTransactionService.processTransaction(streamlinedData, items);
      console.log('✅ [SERVICE RETURNED] streamlinedTransactionService.processTransaction completed', {
        hasResult: !!result,
        resultType: typeof result,
        resultValue: result
      });
    } catch (serviceError) {
      console.error('❌ [SERVICE ERROR] streamlinedTransactionService.processTransaction threw error:', {
        error: serviceError,
        message: serviceError instanceof Error ? serviceError.message : 'Unknown error',
        stack: serviceError instanceof Error ? serviceError.stack : undefined
      });
      toast.error(serviceError instanceof Error ? serviceError.message : 'Transaction processing failed');
      return false;
    }
    
    console.log("🔍 HANDLER - CreateTransaction result:", {
      success: !!result,
      resultType: typeof result,
      transactionId: result?.id,
      receiptNumber: result?.receiptNumber,
      operationId,
      timestamp: new Date().toISOString()
    });
    
    if (result) {
      console.log("🎯 Transaction created successfully, processing inventory deduction:", {
        transactionId: result.id,
        receiptNumber: result.receiptNumber,
        customer: selectedCustomer?.name || 'No customer',
        itemCount: items.length
      });
      
      // Inventory deduction was already handled during transaction creation
      console.log("✅ Transaction created with inventory deduction completed");
      let inventoryStatusText = "Inventory updated";
      
      // ✅ Clear cart immediately after successful transaction
      console.log("🧹 Clearing cart after successful transaction...");
      clearCart();
      
      // Navigate immediately after inventory processing
      console.log("🚀 Navigation to invoice page...");
      navigate(`/invoice/${result.id}`, {
        state: {
          transaction: result,
          customer: selectedCustomer
        },
        replace: true
      });
      
      // Show success message with inventory status
      const isLargeOrder = items.length > 5;
      toast.success(`Transaction completed!${isLargeOrder ? ` (${items.length} items)` : ''} ${inventoryStatusText}.`);
      
      console.log("✅ Transaction flow completed with simple inventory deduction");
      
      // Record performance metrics
      PerformanceMonitor.endTimer(
        operationId,
        'full_transaction_flow',
        {
          itemCount: items.length,
          paymentMethod: finalPaymentMethod,
          total: total,
          inventorySuccess: true
        }
      );
      
      return true;
    } else {
      // Enhanced error handling for failed transactions
      const isLargeOrder = items.length > 5;
      const errorMsg = `Transaction creation failed${isLargeOrder ? ` (${items.length} items)` : ''}`;
      
      console.error("❌ [TRANSACTION FAILED] Service returned null - detailed diagnostic:", {
        operationId,
        itemCount: items.length,
        isLargeOrder,
        storeId: currentStore.id,
        storeName: currentStore.name,
        shiftId: currentShift.id,
        userId: userId,
        total: streamlinedData.total,
        subtotal,
        tax,
        discount,
        paymentMethod: finalPaymentMethod,
        customerId: selectedCustomer?.id,
        orderType,
        deliveryPlatform,
        timestamp: new Date().toISOString(),
        transactionData: {
          hasShiftId: !!streamlinedData.shiftId,
          hasStoreId: !!streamlinedData.storeId,
          hasUserId: !!streamlinedData.userId,
          itemsLength: streamlinedData.items.length,
          hasValidTotal: streamlinedData.total > 0,
          items: streamlinedData.items.map(i => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice
          }))
        },
        cartItems: items.map(i => ({
          productId: i.productId,
          name: i.product?.name || i.name,
          quantity: i.quantity,
          price: i.price
        }))
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