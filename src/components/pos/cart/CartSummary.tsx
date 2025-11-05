import React from 'react';
import { Separator } from '@/components/ui/separator';
import { CartCalculations, SeniorDiscount, OtherDiscount } from '@/services/cart/CartCalculationService';
import { CartItem } from '@/types';
import { BOGOService } from '@/services/cart/BOGOService';
import { CroffleComboPromoService } from '@/services/cart/CroffleComboPromoService';

interface CartSummaryProps {
  calculations: CartCalculations;
  seniorDiscounts: SeniorDiscount[];
  otherDiscount: OtherDiscount | null;
  cartItems?: CartItem[];
}

export function CartSummary({ calculations, seniorDiscounts, otherDiscount, cartItems = [] }: CartSummaryProps) {
  // Calculate BOGO and Combo details for display
  const bogoResult = BOGOService.analyzeBOGO(cartItems);
  const comboResult = CroffleComboPromoService.analyzeCombo(cartItems);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Subtotal</span>
        <span>₱{calculations.grossSubtotal.toFixed(2)}</span>
      </div>
      
      {/* VAT Exemption Display */}
      {calculations.vatExemption > 0 && (
        <div className="flex justify-between text-sm text-blue-600">
          <span>VAT Exemption ({calculations.numberOfSeniors > 0 ? 'Senior' : otherDiscount?.type === 'pwd' ? 'PWD' : 'Senior'})</span>
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
      
      {/* BOGO Promotion Breakdown */}
      {bogoResult.hasEligibleItems && (
        <div className="space-y-1 bg-croffle-accent/5 p-2 rounded">
          <div className="text-xs font-medium text-croffle-accent">BOGO Croffle Promotion</div>
          {bogoResult.breakdown.map((line, index) => (
            <div key={index} className="flex justify-between text-sm text-croffle-accent">
              <span className="text-xs">{line.split('=')[0].trim()}</span>
              <span className="text-xs font-medium">{line.split('=')[1]?.trim()}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Croffle + Coffee Combo Breakdown */}
      {comboResult.hasEligiblePairs && (
        <div className="space-y-1 bg-green-500/5 p-2 rounded">
          <div className="text-xs font-medium text-green-600 dark:text-green-400">Free Coffee Promotion</div>
          {comboResult.breakdown.map((line, index) => (
            <div key={index} className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span className="text-xs">{line.split('=')[0].trim()}</span>
              <span className="text-xs font-medium">{line.split('=')[1]?.trim()}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Other Discount Display */}
      {otherDiscount && otherDiscount.type !== 'bogo' && otherDiscount.type !== 'croffle_combo' && otherDiscount.amount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
        <span>
          Discount Applied
          {otherDiscount?.idNumber && ` - ${otherDiscount.idNumber}`}
        </span>
          <span>-₱{otherDiscount.amount.toFixed(2)}</span>
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
