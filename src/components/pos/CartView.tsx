
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CartItem, Customer } from '@/types';
import { PaymentDialog } from './PaymentDialog';
import { CustomerSelector } from './CustomerSelector';
import { DiscountDialog } from './DiscountDialog';
import MultipleSeniorDiscountSelector from './MultipleSeniorDiscountSelector';
import { OrderTypeSelector } from './OrderTypeSelector';
import { EditableCartItem } from './EditableCartItem';
import { Trash2, Plus, Minus, AlertTriangle } from 'lucide-react';
import { useInventoryValidation } from '@/hooks/pos/useInventoryValidation';
import { useStore } from '@/contexts/StoreContext';
import { useCart } from '@/contexts/cart/CartContext';
import { toast } from 'sonner';
import { SeniorDiscount, OtherDiscount } from '@/services/cart/CartCalculationService';

interface CartViewProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo';
  discountIdNumber?: string;
  seniorDiscounts: SeniorDiscount[];
  otherDiscount?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo', amount: number, idNumber?: string } | null;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  handleApplyDiscount: (discountAmount: number, discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo', idNumber?: string) => void;
  handleApplyMultipleDiscounts: (seniorDiscounts: SeniorDiscount[], otherDiscount?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo', amount: number, idNumber?: string }) => void;
  handlePaymentComplete: (paymentMethod: 'cash' | 'card' | 'e-wallet', amountTendered: number, paymentDetails?: any) => void;
  isShiftActive: boolean;
}

export default function CartView({
  items,
  subtotal,
  tax,
  total,
  discount,
  discountType,
  discountIdNumber,
  seniorDiscounts,
  otherDiscount,
  removeItem,
  updateQuantity,
  clearCart,
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
  
  // Use centralized cart calculations from context
  const { 
    calculations, 
    items: cartItems, 
    seniorDiscounts: contextSeniorDiscounts, 
    otherDiscount: contextOtherDiscount,
    orderType,
    setOrderType,
    deliveryPlatform,
    setDeliveryPlatform,
    deliveryOrderNumber,
    setDeliveryOrderNumber,
    updateItemPrice 
  } = useCart();

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
  
  const canCheckout = cartItems.length > 0 && isShiftActive && !isValidating && !validationMessage && isDeliveryOrderValid;

  return (
    <div className="flex flex-col h-full space-y-4 max-h-screen overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <h3 className="text-lg font-semibold">Cart</h3>
        {cartItems.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearCart}>
            Clear Cart
          </Button>
        )}
      </div>

      {/* Validation Message */}
      {validationMessage && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-800">{validationMessage}</span>
        </div>
      )}

      {/* Order Type Selector */}
      <div className="flex-shrink-0">
        <OrderTypeSelector
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          deliveryPlatform={deliveryPlatform}
          onDeliveryPlatformChange={setDeliveryPlatform}
          deliveryOrderNumber={deliveryOrderNumber}
          onDeliveryOrderNumberChange={setDeliveryOrderNumber}
        />
      </div>

      {/* Cart Items - Scrollable */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="space-y-2 h-full overflow-y-auto">
        {cartItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
        ) : (
          cartItems.map((item, index) => {
            const validation = getItemValidation(item.productId, item.variationId);
            const hasStockIssue = validation && !validation.isValid;
            
            return (
              <EditableCartItem
                key={`${item.productId}-${item.variationId || 'default'}-${index}`}
                item={item}
                index={index}
                quantity={item.quantity}
                onUpdateQuantity={updateQuantity}
                onUpdatePrice={updateItemPrice}
                onRemoveItem={removeItem}
                canEditPrice={orderType === 'online_delivery'}
                hasStockIssue={hasStockIssue}
                validation={validation}
              />
            );
          })
        )}
        </div>
      </div>

      {/* Bottom Section - Fixed with better spacing */}
      {cartItems.length > 0 && (
        <div className="flex-shrink-0 space-y-3 pb-4">
          <Separator />
          
          {/* Customer Selection */}
          <div className="space-y-2">
            <CustomerSelector
              selectedCustomer={selectedCustomer}
              onCustomerSelect={setSelectedCustomer}
            />
          </div>

          {/* Order Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>₱{calculations.grossSubtotal.toFixed(2)}</span>
            </div>
            
            {/* VAT Exemption Display */}
            {calculations.vatExemption > 0 && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>VAT Exemption (Senior)</span>
                <span>-₱{calculations.vatExemption.toFixed(2)}</span>
              </div>
            )}
            
            {/* Multiple Senior Citizens Discount Display */}
            {calculations.numberOfSeniors > 0 && (
              <div className="space-y-1">
                {seniorDiscounts.map((senior, index) => (
                  <div key={senior.id} className="flex justify-between text-sm text-green-600">
                    <span>Senior {index + 1} ({senior.idNumber})</span>
                    <span>-₱{senior.discountAmount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm text-green-600 font-medium border-t border-green-200 pt-1">
                  <span>Total Senior Discount</span>
                  <span>-₱{calculations.seniorDiscountAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
            
            {/* Other Discount Display */}
            {calculations.otherDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  {otherDiscount?.type.toUpperCase()} Discount
                  {otherDiscount?.idNumber && ` - ${otherDiscount.idNumber}`}
                </span>
                <span>-₱{calculations.otherDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span>VAT (12%)</span>
              <span>₱{calculations.adjustedVAT.toFixed(2)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>₱{calculations.finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Multiple Discount Selector */}
          <MultipleSeniorDiscountSelector
            subtotal={calculations.grossSubtotal}
            onApplyDiscounts={handleApplyMultipleDiscounts}
            currentSeniorDiscounts={seniorDiscounts}
            currentOtherDiscount={otherDiscount}
            currentTotalDiners={calculations.totalDiners}
          />

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={() => setIsPaymentDialogOpen(true)}
              className="w-full"
              disabled={!canCheckout}
              size="lg"
            >
              {!isShiftActive ? 'Start Shift to Checkout' : 
               isValidating ? 'Validating Stock...' :
               validationMessage ? 'Fix Stock Issues' :
               !isDeliveryOrderValid ? 'Complete Delivery Info' :
               'Proceed to Payment'}
            </Button>
            
            {/* Delivery validation message */}
            {orderType === 'online_delivery' && !isDeliveryOrderValid && (
              <p className="text-xs text-center text-destructive">
                Please select delivery platform and enter order number
              </p>
            )}
          </div>
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
