
import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Customer } from "@/types";
import { CustomerLookup } from "@/components/pos/customer";
import DiscountSelector from "./DiscountSelector";
import { CartItemsList, CartSummary } from "./cart";
import { useCart } from "@/contexts/cart/CartContext";
import { useMemoizedBOGO } from "@/hooks/pos/useMemoizedBOGO";
import { useMemoizedCroffleCombo } from "@/hooks/pos/useMemoizedCroffleCombo";

interface OptimizedCartViewProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  discount: number;
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'bogo' | 'complimentary' | 'regular' | 'custom' | 'athletes_coaches' | 'solo_parent';
  discountIdNumber?: string;
  handleApplyDiscount: (discountAmount: number, discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'bogo' | 'complimentary' | 'regular' | 'custom' | 'athletes_coaches' | 'solo_parent', idNumber?: string, justification?: string) => void;
  handlePaymentComplete: (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: {
      cardType?: string;
      cardNumber?: string;
      eWalletProvider?: string;
      eWalletReferenceNumber?: string;
    }
  ) => void;
  isShiftActive: boolean;
}

const OptimizedCartView = memo(function OptimizedCartView({
  selectedCustomer,
  setSelectedCustomer,
  discount,
  discountType,
  discountIdNumber,
  handleApplyDiscount,
  handlePaymentComplete,
  isShiftActive
}: OptimizedCartViewProps) {
  const { items, removeItem, updateQuantity, clearCart, calculations } = useCart();
  const subtotal = calculations?.netAmount || 0;
  const tax = calculations?.adjustedVAT || 0;
  const total = calculations?.finalTotal || 0;
  
  // Check for BOGO eligibility (memoized to prevent excessive calculations)
  const bogoResult = useMemoizedBOGO(items);
  
  // Check for Croffle + Coffee combo eligibility
  const comboResult = useMemoizedCroffleCombo(items);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left Column - Order Management */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg text-croffle-primary">Current Order</h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearCart}
            className="text-croffle-accent hover:text-croffle-accent/90 hover:bg-croffle-background"
            disabled={items.length === 0 || !isShiftActive}
          >
            Clear All
          </Button>
        </div>
        
        {/* Promotion Indicators */}
        {(bogoResult.hasEligibleItems || comboResult.hasEligiblePairs) && (
          <div className="space-y-2">
            {bogoResult.hasEligibleItems && (
              <div className="p-2 bg-croffle-accent/10 border border-croffle-accent/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-croffle-accent rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-croffle-accent">BOGO Croffle</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Save ₱{bogoResult.discountAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            {comboResult.hasEligiblePairs && (
              <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">☕ Free Coffee Promotion</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Save ₱{comboResult.discountAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Customer Selection */}
        <CustomerLookup 
          onSelectCustomer={setSelectedCustomer}
          selectedCustomer={selectedCustomer}
        />
        
        {/* Cart Items */}
        <div className="max-h-[calc(100vh-24rem)] overflow-y-auto">
          <CartItemsList
            items={items}
            isTransitioning={false}
            orderType="dine_in"
            deliveryPlatform={null}
            updateQuantity={updateQuantity}
            updateItemPrice={() => {}}
            removeItem={removeItem}
            getItemValidation={() => ({ isValid: true, insufficientItems: [] })}
          />
        </div>
      </div>

      {/* Right Column - Discount and Summary */}
      <div className="space-y-4">
        {/* Discount Selection */}
        <DiscountSelector
          subtotal={subtotal}
          onApplyDiscount={handleApplyDiscount}
          currentDiscount={discount}
          currentDiscountType={discountType}
          currentDiscountIdNumber={discountIdNumber}
          cartItems={items}
        />
        
        {/* Order Summary */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between text-base">
            <span>Subtotal:</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base">
            <span>Tax:</span>
            <span>₱{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>₱{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default OptimizedCartView;
