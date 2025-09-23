import React from 'react';
import { Separator } from '@/components/ui/separator';
import { CartCalculations, SeniorDiscount, OtherDiscount } from '@/services/cart/CartCalculationService';

interface CartSummaryProps {
  calculations: CartCalculations;
  seniorDiscounts: SeniorDiscount[];
  otherDiscount: OtherDiscount | null;
}

export function CartSummary({ calculations, seniorDiscounts, otherDiscount }: CartSummaryProps) {
  return (
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
          Buy 1 Take 1 Discount
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
  );
}
