
import React, { useState, useEffect } from 'react';
import { CartItem, Customer } from '@/types';
import PaymentProcessor from './payment/PaymentProcessor';
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
  handlePaymentComplete: (
    paymentMethod: 'cash' | 'card' | 'e-wallet', 
    amountTendered: number, 
    paymentDetails?: any,
    orderType?: string,
    deliveryPlatform?: string,
    deliveryOrderNumber?: string
  ) => Promise<boolean>;
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

  const handlePaymentCompleteWithInventoryValidation = async (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: any
  ): Promise<boolean> => {
    if (!currentStore?.id) {
      toast.error('No store selected');
      return false;
    }
    
    try {
      // Step 1: Clean up stale cart items first
      const cartItemsForValidation = cartItems.map(item => ({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity
      }));
      
      const { validateAndCleanCart } = await import('@/services/pos/cartCleanupService');
      const cleanupResult = await validateAndCleanCart(cartItemsForValidation, currentStore.id);
      
      if (cleanupResult.removedItems?.length > 0) {
        const suggestions = cleanupResult.removedItems
          .map(removed => {
            const alternatives = cleanupResult.suggestions?.[removed.id] || [];
            return `${removed.name}${alternatives.length > 0 ? ` (Try: ${alternatives.slice(0, 2).map(a => a.name).join(', ')})` : ''}`;
          })
          .join(', ');

        toast.error(`Removed unavailable items: ${suggestions}`);
        return false; // Force user to review cart after cleanup
      }

      // Step 2: Attempt resilient inventory sync with repair
      const { resilientInventoryService } = await import('@/services/pos/resilientInventoryService');
      
      const inventoryItems = cartItems.map(item => ({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity
      }));

      const tempTransactionId = `temp-${Date.now()}`;
      const inventoryResult = await resilientInventoryService.syncInventoryWithResilience(
        tempTransactionId,
        currentStore.id,
        inventoryItems,
        {
          repairOnFailure: true,     // Attempt to repair broken recipe/template links
          allowPartialSync: true,    // Allow transaction with some inventory issues
          skipOnFailure: false       // Don't completely skip inventory validation
        }
      );

      // Step 3: Handle inventory sync results
      if (inventoryResult.warnings.length > 0) {
        console.warn('⚠️ Inventory sync warnings:', inventoryResult.warnings);
        
        // Show repair notifications to user
        const repairWarnings = inventoryResult.warnings.filter(w => w.includes('Repaired:'));
        if (repairWarnings.length > 0) {
          toast.success(`Auto-repaired: ${repairWarnings.length} items fixed automatically`);
        }
        
        const otherWarnings = inventoryResult.warnings.filter(w => !w.includes('Repaired:'));
        if (otherWarnings.length > 0) {
          toast.error(`Inventory issues: ${otherWarnings.slice(0, 2).join(', ')}`);
        }
      }

      // Step 4: Check if transaction can proceed
      if (!inventoryResult.canProceedWithTransaction) {
        toast.error("Cannot process sale - inventory validation failed. Please try again or contact support.");
        return false;
      }

      // Step 5: Log successful repair attempts
      if (inventoryResult.repairAttempted) {
        console.log('🔧 Recipe repair was attempted during checkout');
      }

      // Step 6: Proceed with payment - enhanced inventory tracking in place
      const success = await handlePaymentComplete(
        paymentMethod, 
        amountTendered, 
        paymentDetails,
        orderType,
        deliveryPlatform,
        deliveryOrderNumber
      );

      if (success) {
        setIsPaymentDialogOpen(false);
        
        // Show success message with any relevant repair info
        if (inventoryResult.repairAttempted) {
          toast.success("Payment completed! Some items were auto-repaired during checkout.");
        }
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
        deliveryPlatform={deliveryPlatform}
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
            }}
          />
        </div>
      )}

      {/* Payment Dialog */}
      {isPaymentDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <PaymentProcessor
              total={calculations.finalTotal}
              itemCount={cartItems.length}
              onPaymentComplete={handlePaymentCompleteWithInventoryValidation}
            />
            <div className="p-4 border-t">
              <button
                onClick={() => setIsPaymentDialogOpen(false)}
                className="w-full py-2 px-4 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
