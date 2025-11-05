import React, { useState, useEffect, memo } from 'react';
import { CartItem, Customer } from '@/types';
import PaymentProcessor from './payment/PaymentProcessor';
import { CustomerSelector } from './CustomerSelector';
import MultipleSeniorDiscountSelector from './MultipleSeniorDiscountSelector';
import { OrderTypeSelector } from './OrderTypeSelector';
import { Separator } from '@/components/ui/separator';
import { useOptimizedInventoryValidation } from '@/hooks/pos/useOptimizedInventoryValidation';
import { useStore } from '@/contexts/StoreContext';
import { useCart } from '@/contexts/cart/CartContext';
import { toast } from 'sonner';
import { useMemoizedBOGO } from '@/hooks/pos/useMemoizedBOGO';
import { useMemoizedCroffleCombo } from '@/hooks/pos/useMemoizedCroffleCombo';
import { SeniorDiscount, OtherDiscount } from '@/services/cart/CartCalculationService';
import { quickCheckoutValidation } from '@/services/pos/lightweightValidationService';
import { CartHeader, CartValidationMessage, OptimizedCartItemsList, CartSummary, CartActions } from './cart';
interface CartViewProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  handleApplyDiscount: (discountAmount: number, discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo', idNumber?: string) => void;
  handleApplyMultipleDiscounts: (seniorDiscounts: SeniorDiscount[], otherDiscount?: {
    type: 'pwd' | 'employee' | 'loyalty' | 'promo';
    amount: number;
    idNumber?: string;
  }) => void;
  handlePaymentComplete: (paymentMethod: 'cash' | 'card' | 'e-wallet', amountTendered: number, paymentDetails?: any, orderType?: string, deliveryPlatform?: string, deliveryOrderNumber?: string, cartItems?: CartItem[], cartCalculations?: any) => Promise<boolean>;
  isShiftActive: boolean;
}
const CartView = memo(function CartView({
  selectedCustomer,
  setSelectedCustomer,
  handleApplyDiscount,
  handleApplyMultipleDiscounts,
  handlePaymentComplete,
  isShiftActive
}: CartViewProps) {
  const {
    currentStore
  } = useStore();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [isOrderTypeTransitioning, setIsOrderTypeTransitioning] = useState(false);

  // Use centralized cart calculations from context
  const {
    calculations,
    items: cartItems,
    seniorDiscounts,
    otherDiscount,
    orderType,
    setOrderType,
    deliveryPlatform,
    setDeliveryPlatform,
    deliveryOrderNumber,
    setDeliveryOrderNumber,
    updateItemPrice,
    removeItem,
    updateQuantity,
    clearCart
  } = useCart();

  // Handle order type transitions with loading state
  const handleOrderTypeChange = (newOrderType: any) => {
    setIsOrderTypeTransitioning(true);
    setOrderType(newOrderType);

    // Small delay to ensure context stability
    setTimeout(() => {
      setIsOrderTypeTransitioning(false);
    }, 100);
  };
  const {
    isValidating,
    validateCartItems,
    validateCartImmediate,
    getItemValidation,
    errors,
    warnings,
    validationTime
  } = useOptimizedInventoryValidation(currentStore?.id || '');

  // Validate cart items when they change (debounced automatically)
  useEffect(() => {
    const validateCart = async () => {
      if (cartItems.length === 0) {
        setValidationMessage('');
        return;
      }
      
      await validateCartItems(cartItems);
    };
    validateCart();
  }, [cartItems, validateCartItems]);

  // Update validation message when errors/warnings change (separate effect)
  useEffect(() => {
    if (errors.length > 0) {
      setValidationMessage(errors.join(', ') || 'Some items have insufficient stock');
    } else if (warnings.length > 0) {
      setValidationMessage(warnings.join(', '));
    } else {
      setValidationMessage('');
    }
  }, [errors, warnings]);
  const handlePaymentCompleteWithInventoryValidation = async (paymentMethod: 'cash' | 'card' | 'e-wallet', amountTendered: number, paymentDetails?: any): Promise<boolean> => {
    if (!currentStore?.id) {
      toast.error('No store selected');
      return false;
    }
    
    // CRITICAL: Capture cart items AND calculations here before any async operations
    const currentCartItems = [...cartItems];
    const currentCalculations = { ...calculations };
    console.log('🛒 CART VIEW: Captured cart items for payment', {
      itemCount: currentCartItems.length,
      items: currentCartItems.map(i => ({ 
        id: i.productId, 
        name: i.product?.name, 
        qty: i.quantity,
        price: i.price,
        hasPrice: i.price !== undefined && i.price !== null
      })),
      calculations: {
        grossSubtotal: currentCalculations.grossSubtotal,
        finalTotal: currentCalculations.finalTotal,
        adjustedVAT: currentCalculations.adjustedVAT,
        netAmount: currentCalculations.netAmount
      }
    });
    
    // CRITICAL: Prevent empty cart transactions
    if (!currentCartItems || currentCartItems.length === 0) {
      toast.error('Cannot complete transaction with empty cart');
      console.error('❌ BLOCKED: Attempted transaction with empty cart');
      return false;
    }
    
    try {
      // Step 1: Use IMMEDIATE validation for checkout (bypass debounce)
      const isValid = await validateCartImmediate(currentCartItems);
      
      if (!isValid) {
        toast.error(`Cannot proceed: ${errors.join(', ')}`);
        return false;
      }

      // Proceed with payment - PASS cartItems AND calculations as parameters
      const success = await handlePaymentComplete(
        paymentMethod, 
        amountTendered, 
        paymentDetails, 
        orderType, 
        deliveryPlatform, 
        deliveryOrderNumber,
        currentCartItems, // Pass cart items explicitly
        currentCalculations // Pass calculations explicitly
      );
      if (success) {
        setIsPaymentDialogOpen(false);
      }
      return success;
    } catch (error) {
      console.error('Error during payment validation:', error);
      toast.error('Payment validation failed - please try again');
      return false;
    }
  };

  // Calculate the actual total with proper BIR-compliant calculations
  const actualTotal = calculations.finalTotal;
  const adjustedVAT = calculations.adjustedVAT;

  // Validation for online delivery orders
  const isDeliveryOrderValid = orderType === 'dine_in' || orderType === 'online_delivery' && deliveryPlatform && deliveryOrderNumber.trim();
  const canCheckout = cartItems.length > 0 && isShiftActive && !isValidating && !Boolean(validationMessage) && isDeliveryOrderValid;

  // Check for BOGO eligibility (memoized to prevent excessive calculations)
  const bogoResult = useMemoizedBOGO(cartItems);
  
  // Check for Croffle + Coffee combo eligibility
  const comboResult = useMemoizedCroffleCombo(cartItems);
  
  return <div className="flex flex-col h-full min-h-0 space-y-3 overflow-y-auto pr-1">
      <CartHeader itemCount={cartItems?.length || 0} onClearCart={clearCart} />
      
      {/* Promotion Indicators */}
      {bogoResult.hasEligibleItems && <div className="flex-shrink-0 p-2 bg-croffle-accent/10 border border-croffle-accent/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-croffle-accent rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-croffle-accent">Buy 1 Take 1 Promo Available</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Save ₱{bogoResult.discountAmount.toFixed(2)}
            </span>
          </div>
        </div>}
      
      {/* Croffle + Coffee Combo Indicator */}
      {comboResult.hasEligiblePairs && <div className="flex-shrink-0 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">☕ Free Coffee Promotion</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Save ₱{comboResult.discountAmount.toFixed(2)}
            </span>
          </div>
        </div>}

      <CartValidationMessage message={validationMessage} />

      {/* Order Type Selector */}
      <div className="flex-shrink-0">
        <OrderTypeSelector orderType={orderType} onOrderTypeChange={handleOrderTypeChange} deliveryPlatform={deliveryPlatform} onDeliveryPlatformChange={setDeliveryPlatform} deliveryOrderNumber={deliveryOrderNumber} onDeliveryOrderNumberChange={setDeliveryOrderNumber} />
      </div>

      {/* Cart Items - Optimized with React.memo */}
      <OptimizedCartItemsList items={cartItems || []} isTransitioning={isOrderTypeTransitioning} orderType={orderType} deliveryPlatform={deliveryPlatform} updateQuantity={updateQuantity} updateItemPrice={updateItemPrice} removeItem={removeItem} getItemValidation={getItemValidation} />

      {/* Bottom Section - Fixed with better spacing */}
      {(cartItems?.length || 0) > 0 && <div className="flex-shrink-0 space-y-2 pb-3">
          <Separator />
          
          {/* Customer Selection */}
          <div className="space-y-2">
            <CustomerSelector selectedCustomer={selectedCustomer} onCustomerSelect={setSelectedCustomer} />
          </div>

          {/* Order Summary */}
          <CartSummary calculations={calculations} seniorDiscounts={seniorDiscounts} otherDiscount={otherDiscount} cartItems={cartItems} />

          {/* Multiple Discount Selector */}
          <MultipleSeniorDiscountSelector subtotal={calculations.grossSubtotal} onApplyDiscounts={handleApplyMultipleDiscounts} currentSeniorDiscounts={seniorDiscounts} currentOtherDiscount={otherDiscount} currentTotalDiners={calculations.totalDiners} cartItems={cartItems} />

          {/* Action Buttons */}
          <CartActions canCheckout={Boolean(canCheckout)} isShiftActive={isShiftActive} isValidating={isValidating} validationMessage={validationMessage} orderType={orderType} deliveryPlatform={deliveryPlatform} deliveryOrderNumber={deliveryOrderNumber} onCheckout={() => {
        // Allow checkout if there are items in cart, even if total is 0 (complimentary)
        if (!calculations || cartItems?.length === 0) {
          toast.error('Cannot checkout with empty cart');
          return;
        }

        // Allow ₱0 total for complimentary discounts
        if (calculations.finalTotal < 0) {
          toast.error('Invalid cart total');
          return;
        }
        setIsPaymentDialogOpen(true);
      }} />
        </div>}

      {/* Payment Dialog */}
      {isPaymentDialogOpen && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <PaymentProcessor total={calculations.finalTotal} itemCount={cartItems.length} onPaymentComplete={handlePaymentCompleteWithInventoryValidation} />
            <div className="p-4 border-t">
              <button onClick={() => setIsPaymentDialogOpen(false)} className="w-full py-2 px-4 bg-gray-200 rounded hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>}
    </div>;
});

export default CartView;