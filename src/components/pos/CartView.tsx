import React, { useState, useEffect } from 'react';
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
import { BOGOService } from '@/services/cart/BOGOService';
import { SeniorDiscount, OtherDiscount } from '@/services/cart/CartCalculationService';
import { quickCheckoutValidation } from '@/services/pos/lightweightValidationService';
import { CartHeader, CartValidationMessage, CartItemsList, CartSummary, CartActions } from './cart';
interface CartViewProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  handleApplyDiscount: (discountAmount: number, discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo', idNumber?: string) => void;
  handleApplyMultipleDiscounts: (seniorDiscounts: SeniorDiscount[], otherDiscount?: {
    type: 'pwd' | 'employee' | 'loyalty' | 'promo';
    amount: number;
    idNumber?: string;
  }) => void;
  handlePaymentComplete: (paymentMethod: 'cash' | 'card' | 'e-wallet', amountTendered: number, paymentDetails?: any, orderType?: string, deliveryPlatform?: string, deliveryOrderNumber?: string) => Promise<boolean>;
  isShiftActive: boolean;
}
export default function CartView({
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

  // Debug logging to track cart data
  console.log('🔍 CartView: Cart data from context', {
    itemCount: cartItems?.length || 0,
    orderType,
    calculations: calculations,
    calculationsFinalTotal: calculations?.finalTotal,
    calculationsType: typeof calculations,
    seniorDiscountsCount: seniorDiscounts?.length || 0,
    cartItemsRaw: cartItems,
    isOrderTypeTransitioning
  });

  // Debug logging for cart items
  useEffect(() => {
    console.log('CartView: Cart items changed', {
      itemCount: cartItems?.length || 0,
      orderType,
      isTransitioning: isOrderTypeTransitioning,
      items: cartItems?.map(item => ({
        id: item.productId,
        name: item.product.name
      }))
    });
  }, [cartItems, orderType, isOrderTypeTransitioning]);

  // Handle order type transitions with loading state
  const handleOrderTypeChange = (newOrderType: any) => {
    console.log('CartView: Order type changing', {
      from: orderType,
      to: newOrderType
    });
    setIsOrderTypeTransitioning(true);
    setOrderType(newOrderType);

    // Small delay to ensure context stability
    setTimeout(() => {
      setIsOrderTypeTransitioning(false);
      console.log('CartView: Order type transition complete');
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
      
      console.log('🔄 [CART VIEW] Starting debounced validation for', cartItems.length, 'items');
      const startTime = performance.now();
      
      const isValid = await validateCartItems(cartItems);
      
      const duration = performance.now() - startTime;
      console.log('✅ [CART VIEW] Validation complete', {
        isValid,
        duration: `${duration.toFixed(2)}ms`,
        errors: errors.length,
        warnings: warnings.length
      });
      
      if (!isValid) {
        setValidationMessage(errors.join(', ') || 'Some items have insufficient stock');
      } else if (warnings.length > 0) {
        setValidationMessage(warnings.join(', '));
      } else {
        setValidationMessage('');
      }
    };
    validateCart();
  }, [cartItems, validateCartItems, errors, warnings]);
  const handlePaymentCompleteWithInventoryValidation = async (paymentMethod: 'cash' | 'card' | 'e-wallet', amountTendered: number, paymentDetails?: any): Promise<boolean> => {
    if (!currentStore?.id) {
      toast.error('No store selected');
      return false;
    }
    try {
      // Step 1: Use IMMEDIATE validation for checkout (bypass debounce)
      console.log('⚡ [CHECKOUT] Starting immediate validation for', cartItems.length, 'items');
      const isValid = await validateCartImmediate(cartItems);
      
      if (!isValid) {
        toast.error(`Cannot proceed: ${errors.join(', ')}`);
        return false;
      }

      // Proceed with payment
      const success = await handlePaymentComplete(paymentMethod, amountTendered, paymentDetails, orderType, deliveryPlatform, deliveryOrderNumber);
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

  // Check for BOGO eligibility
  const bogoResult = BOGOService.analyzeBOGO(cartItems);
  return <div className="flex flex-col h-full min-h-0 space-y-3 overflow-y-auto pr-1">
      <CartHeader itemCount={cartItems?.length || 0} onClearCart={clearCart} />
      
      {/* BOGO Eligibility Indicator */}
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

      <CartValidationMessage message={validationMessage} />

      {/* Order Type Selector */}
      <div className="flex-shrink-0">
        <OrderTypeSelector orderType={orderType} onOrderTypeChange={handleOrderTypeChange} deliveryPlatform={deliveryPlatform} onDeliveryPlatformChange={setDeliveryPlatform} deliveryOrderNumber={deliveryOrderNumber} onDeliveryOrderNumberChange={setDeliveryOrderNumber} />
      </div>

      {/* Cart Items */}
      <CartItemsList items={cartItems || []} isTransitioning={isOrderTypeTransitioning} orderType={orderType} deliveryPlatform={deliveryPlatform} updateQuantity={updateQuantity} updateItemPrice={updateItemPrice} removeItem={removeItem} getItemValidation={getItemValidation} />

      {/* Bottom Section - Fixed with better spacing */}
      {(cartItems?.length || 0) > 0 && <div className="flex-shrink-0 space-y-2 pb-3">
          <Separator />
          
          {/* Customer Selection */}
          <div className="space-y-2">
            <CustomerSelector selectedCustomer={selectedCustomer} onCustomerSelect={setSelectedCustomer} />
          </div>

          {/* Order Summary */}
          <CartSummary calculations={calculations} seniorDiscounts={seniorDiscounts} otherDiscount={otherDiscount} />

          {/* Multiple Discount Selector */}
          <MultipleSeniorDiscountSelector subtotal={calculations.grossSubtotal} onApplyDiscounts={handleApplyMultipleDiscounts} currentSeniorDiscounts={seniorDiscounts} currentOtherDiscount={otherDiscount} currentTotalDiners={calculations.totalDiners} cartItems={cartItems} />

          {/* Action Buttons */}
          <CartActions canCheckout={Boolean(canCheckout)} isShiftActive={isShiftActive} isValidating={isValidating} validationMessage={validationMessage} orderType={orderType} deliveryPlatform={deliveryPlatform} deliveryOrderNumber={deliveryOrderNumber} onCheckout={() => {
        console.log("🚀 Checkout attempt", {
          calculationsObject: calculations,
          finalTotal: calculations?.finalTotal,
          cartItemsLength: cartItems?.length,
          type: typeof calculations
        });

        // Allow checkout if there are items in cart, even if total is 0 (complimentary)
        if (!calculations || cartItems?.length === 0) {
          console.error("❌ Checkout blocked - no items in cart", {
            calculations,
            finalTotal: calculations?.finalTotal,
            itemsInCart: cartItems?.length
          });
          toast.error('Cannot checkout with empty cart');
          return;
        }

        // Allow ₱0 total for complimentary discounts
        if (calculations.finalTotal < 0) {
          console.error("❌ Checkout blocked - negative total", {
            finalTotal: calculations.finalTotal
          });
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
}