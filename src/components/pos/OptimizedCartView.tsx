
import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Customer } from "@/types";
import { CustomerLookup } from "@/components/pos/customer";
import DiscountSelector from "./DiscountSelector";
import { CartItemList, CartSummary } from "./cart";
import { useCartState, useCartActions, useCartCalculations } from "@/contexts/OptimizedCartContext";

interface OptimizedCartViewProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  discount: number;
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo';
  discountIdNumber?: string;
  handleApplyDiscount: (discountAmount: number, discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo', idNumber?: string) => void;
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
  const { items } = useCartState();
  const { removeItem, updateQuantity, clearCart } = useCartActions();
  const { subtotal, tax, total } = useCartCalculations();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
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
      
      {/* Customer Selection */}
      <div className="mb-4">
        <CustomerLookup 
          onSelectCustomer={setSelectedCustomer}
          selectedCustomer={selectedCustomer}
        />
      </div>
      
      {/* Cart Items */}
      <div className="mb-4 max-h-[calc(100vh-22rem)] overflow-y-auto">
        <CartItemList 
          items={items}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
          isShiftActive={isShiftActive}
        />
      </div>
      
      {/* Discount Selection */}
      <DiscountSelector
        subtotal={subtotal}
        onApplyDiscount={handleApplyDiscount}
        currentDiscount={discount}
        currentDiscountType={discountType}
        currentDiscountIdNumber={discountIdNumber}
      />
      
      {/* Order Summary */}
      <CartSummary
        subtotal={subtotal}
        tax={tax}
        total={total}
        discount={discount}
        discountType={discountType}
        handlePaymentComplete={handlePaymentComplete}
      />
    </div>
  );
});

export default OptimizedCartView;
