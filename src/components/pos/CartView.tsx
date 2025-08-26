
import React, { useState, useEffect } from 'react';
import { CartItem, Customer } from '@/types';
import { PaymentDialog } from './PaymentDialog';
import { CustomerSelector } from './CustomerSelector';
import MultipleSeniorDiscountSelector from './MultipleSeniorDiscountSelector';
import { OrderTypeSelector } from './OrderTypeSelector';
import { Separator } from '@/components/ui/separator';
import { useInventoryValidation } from '@/hooks/pos/useInventoryValidation';
import { useStore } from '@/contexts/StoreContext';
import { useCart } from '@/contexts/cart/CartContext';
import { toast } from 'sonner';
import { SeniorDiscount, OtherDiscount } from '@/services/cart/CartCalculationService';
import {
  CartHeader,
  CartValidationMessage,
  CartItemsList,
  CartSummary,
  CartActions
} from './cart';

interface CartViewProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  handleApplyDiscount: (discountAmount: number, discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo', idNumber?: string) => void;
  handleApplyMultipleDiscounts: (seniorDiscounts: SeniorDiscount[], otherDiscount?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo', amount: number, idNumber?: string }) => void;
  handlePaymentComplete: (paymentMethod: 'cash' | 'card' | 'e-wallet', amountTendered: number, paymentDetails?: any) => void;
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
  const { currentStore } = useStore();
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
  console.log('CartView: Cart data from context', {
    itemCount: cartItems?.length || 0,
    orderType,
    calculations: calculations.finalTotal,
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
      items: cartItems?.map(item => ({ id: item.productId, name: item.product.name }))
    });
  }, [cartItems, orderType, isOrderTypeTransitioning]);

  // Handle order type transitions with loading state
  const handleOrderTypeChange = (newOrderType: any) => {
    console.log('CartView: Order type changing', { from: orderType, to: newOrderType });
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
    processCartSale, 
    getItemValidation 
  } = useInventoryValidation(currentStore?.id || '');

  // Validate cart items when they change
  useEffect(() => {
    const validateCart = async () => {
      if (cartItems.length === 0) {
        setValidationMessage('');
        return;
      }

      const isValid = await validateCartItems(cartItems);
      if (!isValid) {
        setValidationMessage('Some items have insufficient stock');
      } else {
        setValidationMessage('');
      }
    };

    validateCart();
  }, [cartItems, validateCartItems]);

  const handlePaymentCompleteWithDeduction = async (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: any
  ) => {
    if (!currentStore?.id) {
      toast.error('No store selected');
      return;
    }

    // Generate temporary transaction ID for tracking
    const tempTransactionId = `temp-${Date.now()}`;
    
    try {
      // Process inventory deductions first
      const deductionSuccess = await processCartSale(cartItems, tempTransactionId);
      if (!deductionSuccess) {
        toast.error('Failed to process inventory deductions');
        return;
      }

      // If deductions successful, complete the payment
      handlePaymentComplete(paymentMethod, amountTendered, paymentDetails);
      setIsPaymentDialogOpen(false);
    } catch (error) {
      console.error('Error processing payment with deductions:', error);
      toast.error('Payment processing failed');
    }
  };
  
  // Calculate the actual total with proper BIR-compliant calculations
  const actualTotal = calculations.finalTotal;
  const adjustedVAT = calculations.adjustedVAT;
  
  // Validation for online delivery orders
  const isDeliveryOrderValid = orderType === 'dine_in' || 
    (orderType === 'online_delivery' && deliveryPlatform && deliveryOrderNumber.trim());
  
  const canCheckout = cartItems.length > 0 && isShiftActive && !isValidating && !Boolean(validationMessage) && isDeliveryOrderValid;

  return (
    <div className="flex flex-col h-full space-y-3 max-h-screen overflow-hidden">
      <CartHeader 
        itemCount={cartItems?.length || 0}
        onClearCart={clearCart}
      />

      <CartValidationMessage message={validationMessage} />

      {/* Order Type Selector */}
      <div className="flex-shrink-0">
        <OrderTypeSelector
          orderType={orderType}
          onOrderTypeChange={handleOrderTypeChange}
          deliveryPlatform={deliveryPlatform}
          onDeliveryPlatformChange={setDeliveryPlatform}
          deliveryOrderNumber={deliveryOrderNumber}
          onDeliveryOrderNumberChange={setDeliveryOrderNumber}
        />
      </div>

      {/* Cart Items */}
      <CartItemsList
        items={cartItems || []}
        isTransitioning={isOrderTypeTransitioning}
        orderType={orderType}
        updateQuantity={updateQuantity}
        updateItemPrice={updateItemPrice}
        removeItem={removeItem}
        getItemValidation={getItemValidation}
      />

      {/* Bottom Section - Fixed with better spacing */}
      {(cartItems?.length || 0) > 0 && (
        <div className="flex-shrink-0 space-y-2 pb-3">
          <Separator />
          
          {/* Customer Selection */}
          <div className="space-y-2">
            <CustomerSelector
              selectedCustomer={selectedCustomer}
              onCustomerSelect={setSelectedCustomer}
            />
          </div>

          {/* Order Summary */}
          <CartSummary
            calculations={calculations}
            seniorDiscounts={seniorDiscounts}
            otherDiscount={otherDiscount}
          />

          {/* Multiple Discount Selector */}
          <MultipleSeniorDiscountSelector
            subtotal={calculations.grossSubtotal}
            onApplyDiscounts={handleApplyMultipleDiscounts}
            currentSeniorDiscounts={seniorDiscounts}
            currentOtherDiscount={otherDiscount}
            currentTotalDiners={calculations.totalDiners}
          />

          {/* Action Buttons */}
          <CartActions
            canCheckout={Boolean(canCheckout)}
            isShiftActive={isShiftActive}
            isValidating={isValidating}
            validationMessage={validationMessage}
            orderType={orderType}
            deliveryPlatform={deliveryPlatform}
            deliveryOrderNumber={deliveryOrderNumber}
            onCheckout={() => {
              if (calculations.finalTotal <= 0) {
                toast.error('Cannot checkout with empty cart');
                return;
              }
              setIsPaymentDialogOpen(true);
            }}
          />
        </div>
      )}

      {/* Dialogs */}
      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        total={calculations.finalTotal}
        onPaymentComplete={handlePaymentCompleteWithDeduction}
      />
    </div>
  );
}
