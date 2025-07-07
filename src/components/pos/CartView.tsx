
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
import { Trash2, Plus, Minus, AlertTriangle } from 'lucide-react';
import { useInventoryValidation } from '@/hooks/pos/useInventoryValidation';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { SeniorDiscount } from '@/hooks/useTransactionHandler';

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
  
  const { 
    isValidating, 
    validateCartItems, 
    processCartSale, 
    getItemValidation 
  } = useInventoryValidation(currentStore?.id || '');

  // Validate cart items when they change
  useEffect(() => {
    const validateCart = async () => {
      if (items.length === 0) {
        setValidationMessage('');
        return;
      }

      const isValid = await validateCartItems(items);
      if (!isValid) {
        setValidationMessage('Some items have insufficient stock');
      } else {
        setValidationMessage('');
      }
    };

    validateCart();
  }, [items, validateCartItems]);

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
      const deductionSuccess = await processCartSale(items, tempTransactionId);
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

  const canCheckout = items.length > 0 && isShiftActive && !isValidating && !validationMessage;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <h3 className="text-lg font-semibold">Cart</h3>
        {items.length > 0 && (
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

      {/* Cart Items - Scrollable */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="space-y-2 h-full overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
        ) : (
          items.map((item, index) => {
            const validation = getItemValidation(item.productId, item.variationId);
            const hasStockIssue = validation && !validation.isValid;
            
            return (
              <Card key={`${item.productId}-${item.variationId || 'default'}-${index}`} 
                    className={hasStockIssue ? 'border-amber-200 bg-amber-50' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {item.product.name}
                        {item.variation && (
                          <span className="text-muted-foreground"> ({item.variation.name})</span>
                        )}
                      </h4>
                      {hasStockIssue && (
                        <p className="text-xs text-amber-600 mt-1">
                          Insufficient stock: {validation.insufficientItems.join(', ')}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        ₱{item.price.toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(index, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          disabled={hasStockIssue}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </span>
                    {hasStockIssue && (
                      <Badge variant="secondary" className="text-xs">
                        Stock Issue
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        </div>
      </div>

      {/* Bottom Section - Fixed */}
      {items.length > 0 && (
        <div className="flex-shrink-0 space-y-4">
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
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  Discount {discountType && `(${discountType.toUpperCase()})`}
                  {discountIdNumber && ` - ${discountIdNumber}`}
                </span>
                <span>-₱{discount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span>VAT (12%)</span>
              <span>₱{tax.toFixed(2)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Multiple Discount Selector */}
          <MultipleSeniorDiscountSelector
            subtotal={subtotal}
            onApplyDiscounts={handleApplyMultipleDiscounts}
            currentSeniorDiscounts={seniorDiscounts}
            currentOtherDiscount={otherDiscount}
          />

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={() => setIsPaymentDialogOpen(true)}
              className="w-full"
              disabled={!canCheckout}
              size="lg"
            >
              {!isShiftActive ? 'Start Shift to Checkout' : 
               isValidating ? 'Validating Stock...' :
               validationMessage ? 'Fix Stock Issues' :
               'Proceed to Payment'}
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        total={total}
        onPaymentComplete={handlePaymentCompleteWithDeduction}
      />

    </div>
  );
}
