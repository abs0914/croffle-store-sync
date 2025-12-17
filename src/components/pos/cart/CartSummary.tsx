import React from 'react';
import { Separator } from '@/components/ui/separator';
import { 
  CartCalculations, 
  SeniorDiscount, 
  OtherDiscount, 
  DiscountBeneficiary,
  getDiscountLabel,
  isVATExemptDiscount 
} from '@/services/cart/CartCalculationService';
import { CartItem } from '@/types';
import { BOGOService } from '@/services/cart/BOGOService';
import { CroffleComboPromoService } from '@/services/cart/CroffleComboPromoService';

interface CartSummaryProps {
  calculations: CartCalculations;
  seniorDiscounts: SeniorDiscount[];
  otherDiscount: OtherDiscount | null;
  cartItems?: CartItem[];
  discountBeneficiaries?: DiscountBeneficiary[];
}

export function CartSummary({ 
  calculations, 
  seniorDiscounts, 
  otherDiscount, 
  cartItems = [],
  discountBeneficiaries = []
}: CartSummaryProps) {
  // Calculate BOGO and Combo details for display
  const bogoResult = BOGOService.analyzeBOGO(cartItems);
  const comboResult = CroffleComboPromoService.analyzeCombo(cartItems);
  
  // Use beneficiary breakdown if available, otherwise fall back to legacy
  const beneficiaries = calculations.beneficiaryBreakdown?.length 
    ? calculations.beneficiaryBreakdown 
    : discountBeneficiaries;
  
  // Group beneficiaries by type for display
  const beneficiaryGroups = React.useMemo(() => {
    const groups: Record<string, DiscountBeneficiary[]> = {};
    for (const b of beneficiaries) {
      if (!groups[b.type]) groups[b.type] = [];
      groups[b.type].push(b);
    }
    return groups;
  }, [beneficiaries]);

  // Get VAT exemption label based on discount types present
  const getVATExemptionLabel = () => {
    if (beneficiaries.length > 0) {
      const vatExemptTypes = [...new Set(beneficiaries.filter(b => b.isVATExempt).map(b => b.type))];
      if (vatExemptTypes.length === 0) return 'VAT Exempt';
      if (vatExemptTypes.length === 1) return `VAT Exemption (${getDiscountLabel(vatExemptTypes[0])})`;
      return `VAT Exemption (${vatExemptTypes.map(t => getDiscountLabel(t)).join(', ')})`;
    }
    
    // Legacy fallback
    if (calculations.numberOfSeniors > 0) return 'VAT Exemption (Senior)';
    if (otherDiscount?.type === 'pwd') return 'VAT Exemption (PWD)';
    if (otherDiscount?.type === 'athletes_coaches') return 'VAT Exemption (NAAC)';
    if (otherDiscount?.type === 'solo_parent') return 'VAT Exemption (Solo Parent)';
    return 'VAT Exemption';
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Subtotal</span>
        <span>₱{calculations.grossSubtotal.toFixed(2)}</span>
      </div>
      
      {/* VAT Exemption Display */}
      {calculations.vatExemption > 0 && (
        <div className="flex justify-between text-sm text-blue-600">
          <span>{getVATExemptionLabel()}</span>
          <span>-₱{calculations.vatExemption.toFixed(2)}</span>
        </div>
      )}
      
      {/* Multi-Beneficiary Discount Display */}
      {beneficiaries.length > 0 && Object.keys(beneficiaryGroups).length > 0 && (
        <div className="space-y-1">
          {Object.entries(beneficiaryGroups).map(([type, groupBeneficiaries]) => {
            const typeTotal = groupBeneficiaries.reduce((sum, b) => sum + b.discountAmount, 0);
            const label = getDiscountLabel(type as any);
            const count = groupBeneficiaries.length;
            
            return (
              <div key={type}>
                {/* Show individual breakdowns if multiple of same type */}
                {count > 1 ? (
                  <>
                    {groupBeneficiaries.map((b, idx) => (
                      <div key={b.id} className="flex justify-between text-sm text-green-600">
                        <span className="text-xs">
                          {label} {idx + 1} {b.idNumber && `(${b.idNumber})`}
                        </span>
                        <span className="text-xs">-₱{b.discountAmount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm text-green-600 font-medium border-t border-green-200 pt-1">
                      <span>Total {label} Discount ({count}x)</span>
                      <span>-₱{typeTotal.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>
                      {label} Discount
                      {groupBeneficiaries[0].idNumber && ` (${groupBeneficiaries[0].idNumber})`}
                    </span>
                    <span>-₱{typeTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Legacy: Multiple Senior Citizens Discount Display */}
      {beneficiaries.length === 0 && calculations.numberOfSeniors > 0 && (
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
      
      {/* Legacy: Other Discount Display */}
      {beneficiaries.length === 0 && otherDiscount && otherDiscount.type !== 'bogo' && otherDiscount.type !== 'croffle_combo' && calculations.otherDiscountAmount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>
            {getDiscountLabel(otherDiscount.type)} Discount
            {otherDiscount.idNumber && ` (${otherDiscount.idNumber})`}
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
