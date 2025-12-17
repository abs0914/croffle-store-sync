import { CartItem } from "@/types";
import { BOGOService } from "./BOGOService";
import { CroffleComboPromoService } from "./CroffleComboPromoService";

// Legacy interfaces for backward compatibility
export interface SeniorDiscount {
  id: string;
  idNumber: string;
  name: string;
  discountAmount: number;
}

export interface OtherDiscount {
  type: DiscountType;
  amount: number;
  idNumber?: string;
  justification?: string;
  customPercentage?: number;
}

// New unified discount beneficiary interface
export type DiscountType = 'senior' | 'pwd' | 'athletes_coaches' | 'solo_parent' | 'employee' | 'loyalty' | 'promo' | 'complimentary' | 'bogo' | 'croffle_combo' | 'regular' | 'custom';

export interface DiscountBeneficiary {
  id: string;
  type: DiscountType;
  idNumber: string;
  name: string;
  discountAmount: number;
  vatExemptionAmount: number;
  isVATExempt: boolean;
  discountRate: number;
}

export interface CartCalculations {
  // Raw totals
  grossSubtotal: number;
  netAmount: number;
  
  // VAT calculations
  standardVAT: number;
  vatExemption: number;
  adjustedVAT: number;
  
  // Discounts
  seniorDiscountAmount: number;
  otherDiscountAmount: number;
  totalDiscountAmount: number;
  
  // Final totals
  finalTotal: number;
  
  // Breakdown for BIR compliance
  vatableSales: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  
  // Metadata
  totalDiners: number;
  numberOfSeniors: number;
  
  // New: Multi-discount beneficiary breakdown
  beneficiaryBreakdown?: DiscountBeneficiary[];
  regularDinerCount?: number;
}

// Discount configuration
const DISCOUNT_CONFIG: Record<DiscountType, { rate: number; isVATExempt: boolean; requiresId: boolean; label: string }> = {
  senior: { rate: 0.20, isVATExempt: true, requiresId: true, label: 'Senior Citizen' },
  pwd: { rate: 0.20, isVATExempt: true, requiresId: true, label: 'PWD' },
  athletes_coaches: { rate: 0.20, isVATExempt: true, requiresId: true, label: 'NAAC' },
  solo_parent: { rate: 0.20, isVATExempt: true, requiresId: true, label: 'Solo Parent' },
  employee: { rate: 0.15, isVATExempt: false, requiresId: false, label: 'Employee' },
  loyalty: { rate: 0.10, isVATExempt: false, requiresId: false, label: 'Loyalty' },
  regular: { rate: 0.05, isVATExempt: false, requiresId: false, label: 'Regular' },
  promo: { rate: 0, isVATExempt: false, requiresId: false, label: 'Promo' },
  complimentary: { rate: 1.0, isVATExempt: false, requiresId: false, label: 'Complimentary' },
  bogo: { rate: 0, isVATExempt: false, requiresId: false, label: 'BOGO' },
  croffle_combo: { rate: 0, isVATExempt: false, requiresId: false, label: 'Croffle Combo' },
  custom: { rate: 0, isVATExempt: false, requiresId: false, label: 'Custom' }
};

// Priority order for conflict resolution: Senior > PWD > NAAC > Solo Parent
const DISCOUNT_PRIORITY: DiscountType[] = ['senior', 'pwd', 'athletes_coaches', 'solo_parent'];

export function getDiscountConfig(type: DiscountType) {
  return DISCOUNT_CONFIG[type];
}

export function getDiscountLabel(type: DiscountType): string {
  return DISCOUNT_CONFIG[type]?.label || type.toUpperCase();
}

export function isVATExemptDiscount(type: DiscountType): boolean {
  return DISCOUNT_CONFIG[type]?.isVATExempt || false;
}

export function requiresIdNumber(type: DiscountType): boolean {
  return DISCOUNT_CONFIG[type]?.requiresId || false;
}

export class CartCalculationService {
  private static readonly VAT_RATE = 0.12;

  /**
   * NEW: Calculate cart totals with multiple discount beneficiaries
   * Supports mixing different discount types (e.g., 2 Seniors + 1 PWD + 1 NAAC)
   */
  static calculateWithBeneficiaries(
    items: CartItem[],
    beneficiaries: DiscountBeneficiary[],
    totalDiners: number = 1,
    customPercentage?: number
  ): CartCalculations {
    // Validate items
    const invalidItems = items.filter(i => i.price == null || i.price < 0 || !i.quantity || i.quantity <= 0);
    if (invalidItems.length > 0) {
      console.error("❌ CartCalculationService: Items without valid prices/quantities:", invalidItems);
      return this.getEmptyCalculations();
    }

    console.log("🧮 CartCalculationService: Multi-beneficiary calculation", {
      itemsCount: items.length,
      beneficiariesCount: beneficiaries.length,
      totalDiners,
      beneficiaryTypes: beneficiaries.map(b => b.type)
    });

    // Calculate gross subtotal (VAT-inclusive)
    const grossSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Ensure total diners >= beneficiaries
    const effectiveTotalDiners = Math.max(totalDiners, beneficiaries.length);
    const regularDinerCount = effectiveTotalDiners - beneficiaries.length;
    
    // Per-person gross share (VAT-inclusive)
    const perPersonGrossShare = effectiveTotalDiners > 0 ? grossSubtotal / effectiveTotalDiners : grossSubtotal;
    
    // Group beneficiaries by VAT-exempt status
    const vatExemptBeneficiaries = beneficiaries.filter(b => isVATExemptDiscount(b.type));
    const standardBeneficiaries = beneficiaries.filter(b => !isVATExemptDiscount(b.type));
    
    let totalVATExemption = 0;
    let totalSeniorDiscount = 0;
    let totalOtherDiscount = 0;
    let vatExemptSales = 0;
    const updatedBeneficiaries: DiscountBeneficiary[] = [];
    
    // Process VAT-exempt beneficiaries (Senior, PWD, NAAC, Solo Parent)
    for (const beneficiary of vatExemptBeneficiaries) {
      const config = DISCOUNT_CONFIG[beneficiary.type];
      
      // VAT-exempt sale = gross / 1.12
      const vatExemptSale = perPersonGrossShare / (1 + this.VAT_RATE);
      
      // VAT exemption = gross - VAT-exempt sale
      const vatExemption = perPersonGrossShare - vatExemptSale;
      
      // 20% discount on VAT-exempt sale
      const discountAmount = vatExemptSale * config.rate;
      
      vatExemptSales += vatExemptSale;
      totalVATExemption += vatExemption;
      
      if (beneficiary.type === 'senior') {
        totalSeniorDiscount += discountAmount;
      } else {
        totalOtherDiscount += discountAmount;
      }
      
      updatedBeneficiaries.push({
        ...beneficiary,
        discountAmount,
        vatExemptionAmount: vatExemption,
        isVATExempt: true,
        discountRate: config.rate
      });
    }
    
    // Process standard discount beneficiaries (Employee, Loyalty, etc.)
    for (const beneficiary of standardBeneficiaries) {
      const config = DISCOUNT_CONFIG[beneficiary.type];
      let discountAmount = 0;
      
      if (beneficiary.type === 'complimentary') {
        discountAmount = perPersonGrossShare;
      } else if (beneficiary.type === 'custom' && customPercentage) {
        discountAmount = perPersonGrossShare * (customPercentage / 100);
      } else {
        discountAmount = perPersonGrossShare * config.rate;
      }
      
      totalOtherDiscount += discountAmount;
      
      updatedBeneficiaries.push({
        ...beneficiary,
        discountAmount,
        vatExemptionAmount: 0,
        isVATExempt: false,
        discountRate: beneficiary.type === 'custom' && customPercentage ? customPercentage / 100 : config.rate
      });
    }
    
    // Add BOGO and Combo discounts
    const bogoResult = BOGOService.analyzeBOGO(items);
    const comboResult = CroffleComboPromoService.analyzeCombo(items);
    totalOtherDiscount += bogoResult.discountAmount + comboResult.discountAmount;
    
    // Calculate final values
    const standardVAT = grossSubtotal * this.VAT_RATE / (1 + this.VAT_RATE);
    const adjustedVAT = Math.max(0, standardVAT - totalVATExemption);
    const totalDiscountAmount = totalSeniorDiscount + totalOtherDiscount;
    const finalTotal = Math.max(0, grossSubtotal - totalVATExemption - totalDiscountAmount);
    
    // Vatable sales = portion for regular diners
    const vatableSales = regularDinerCount > 0 ? (perPersonGrossShare * regularDinerCount) : 0;
    
    // Net amount calculation
    const netAmount = vatExemptSales + (vatableSales / (1 + this.VAT_RATE));
    
    // Count seniors for legacy compatibility
    const numberOfSeniors = beneficiaries.filter(b => b.type === 'senior').length;
    
    const result: CartCalculations = {
      grossSubtotal,
      netAmount,
      standardVAT,
      vatExemption: totalVATExemption,
      adjustedVAT,
      seniorDiscountAmount: totalSeniorDiscount,
      otherDiscountAmount: totalOtherDiscount,
      totalDiscountAmount,
      finalTotal,
      vatableSales,
      vatExemptSales,
      zeroRatedSales: 0,
      totalDiners: effectiveTotalDiners,
      numberOfSeniors,
      beneficiaryBreakdown: updatedBeneficiaries,
      regularDinerCount
    };
    
    console.log("🧮 CartCalculationService: Multi-beneficiary result", result);
    return result;
  }

  /**
   * LEGACY: Calculate cart totals with old interface
   * Converts old format to new beneficiary format internally
   */
  static calculateCartTotals(
    items: CartItem[],
    seniorDiscounts: SeniorDiscount[] = [],
    otherDiscount?: OtherDiscount | null,
    totalDiners: number = 1
  ): CartCalculations {
    // Convert legacy format to beneficiaries
    const beneficiaries: DiscountBeneficiary[] = [];
    
    // Add seniors as beneficiaries
    for (const senior of seniorDiscounts) {
      beneficiaries.push({
        id: senior.id,
        type: 'senior',
        idNumber: senior.idNumber,
        name: senior.name,
        discountAmount: 0,
        vatExemptionAmount: 0,
        isVATExempt: true,
        discountRate: 0.20
      });
    }
    
    // Add other discount as a single beneficiary (if not a group discount like BOGO)
    if (otherDiscount && !['bogo', 'croffle_combo', 'promo'].includes(otherDiscount.type)) {
      beneficiaries.push({
        id: `other-${Date.now()}`,
        type: otherDiscount.type,
        idNumber: otherDiscount.idNumber || '',
        name: otherDiscount.type === 'complimentary' ? (otherDiscount.justification || 'Complimentary') : '',
        discountAmount: 0,
        vatExemptionAmount: 0,
        isVATExempt: isVATExemptDiscount(otherDiscount.type),
        discountRate: DISCOUNT_CONFIG[otherDiscount.type]?.rate || 0
      });
    }
    
    // If there are beneficiaries, use the new calculation method
    if (beneficiaries.length > 0) {
      const result = this.calculateWithBeneficiaries(
        items,
        beneficiaries,
        totalDiners,
        otherDiscount?.customPercentage
      );
      
      // Handle promo/BOGO/combo as additional discounts (not per-person)
      if (otherDiscount && ['bogo', 'croffle_combo', 'promo'].includes(otherDiscount.type)) {
        // These are already handled in calculateWithBeneficiaries via BOGOService/CroffleComboPromoService
        // But if it's a manual promo amount, add it here
        if (otherDiscount.type === 'promo' && otherDiscount.amount > 0) {
          result.otherDiscountAmount += otherDiscount.amount;
          result.totalDiscountAmount += otherDiscount.amount;
          result.finalTotal -= otherDiscount.amount;
        }
      }
      
      return result;
    }
    
    // No beneficiaries - calculate simple totals with automatic promos
    return this.calculateSimpleTotals(items, otherDiscount);
  }
  
  /**
   * Calculate simple totals without beneficiary splitting
   */
  private static calculateSimpleTotals(
    items: CartItem[],
    otherDiscount?: OtherDiscount | null
  ): CartCalculations {
    const invalidItems = items.filter(i => i.price == null || i.price < 0 || !i.quantity || i.quantity <= 0);
    if (invalidItems.length > 0) {
      return this.getEmptyCalculations();
    }
    
    const grossSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const netAmount = grossSubtotal / (1 + this.VAT_RATE);
    
    // BOGO and Combo automatic calculation
    const bogoResult = BOGOService.analyzeBOGO(items);
    const comboResult = CroffleComboPromoService.analyzeCombo(items);
    
    let otherDiscountAmount = bogoResult.discountAmount + comboResult.discountAmount;
    let vatExemption = 0;
    let vatExemptSales = 0;
    let vatableSales = grossSubtotal;
    
    // Handle promo amount
    if (otherDiscount?.type === 'promo' && otherDiscount.amount > 0) {
      otherDiscountAmount += otherDiscount.amount;
    }
    
    const standardVAT = grossSubtotal * this.VAT_RATE / (1 + this.VAT_RATE);
    const adjustedVAT = Math.max(0, standardVAT - vatExemption);
    const finalTotal = Math.max(0, grossSubtotal - vatExemption - otherDiscountAmount);
    
    return {
      grossSubtotal,
      netAmount,
      standardVAT,
      vatExemption,
      adjustedVAT,
      seniorDiscountAmount: 0,
      otherDiscountAmount,
      totalDiscountAmount: otherDiscountAmount,
      finalTotal,
      vatableSales,
      vatExemptSales,
      zeroRatedSales: 0,
      totalDiners: 1,
      numberOfSeniors: 0
    };
  }

  /**
   * Distribute discounts evenly among seniors (legacy support)
   */
  static distributeSeniorDiscounts(
    totalSeniorDiscount: number,
    seniorDiscounts: SeniorDiscount[]
  ): SeniorDiscount[] {
    if (seniorDiscounts.length === 0) return [];
    
    const perSeniorAmount = totalSeniorDiscount / seniorDiscounts.length;
    return seniorDiscounts.map(discount => ({
      ...discount,
      discountAmount: perSeniorAmount
    }));
  }

  /**
   * Preview calculation for senior discount (legacy support)
   */
  static calculateSeniorDiscountPreview(
    grossSubtotal: number,
    numberOfSeniors: number,
    totalDiners: number
  ) {
    if (numberOfSeniors === 0 || totalDiners === 0) {
      return {
        perPersonGrossShare: 0,
        perSeniorVATExemptSale: 0,
        perSeniorDiscountAmount: 0,
        totalSeniorDiscount: 0,
        totalVATExemption: 0,
        perSeniorPays: 0
      };
    }

    const perPersonGrossShare = grossSubtotal / totalDiners;
    const perSeniorVATExemptSale = perPersonGrossShare / (1 + this.VAT_RATE);
    const perSeniorVATExemption = perPersonGrossShare - perSeniorVATExemptSale;
    const perSeniorDiscountAmount = perSeniorVATExemptSale * 0.20;
    const totalSeniorDiscount = perSeniorDiscountAmount * numberOfSeniors;
    const totalVATExemption = perSeniorVATExemption * numberOfSeniors;
    const perSeniorPays = perPersonGrossShare - perSeniorVATExemption - perSeniorDiscountAmount;

    return {
      perPersonGrossShare,
      perSeniorVATExemptSale,
      perSeniorDiscountAmount,
      totalSeniorDiscount,
      totalVATExemption,
      perSeniorPays
    };
  }

  /**
   * NEW: Preview calculation for any discount type
   */
  static calculateDiscountPreview(
    grossSubtotal: number,
    type: DiscountType,
    totalDiners: number = 1,
    customPercentage?: number
  ) {
    const config = DISCOUNT_CONFIG[type];
    const perPersonGrossShare = grossSubtotal / totalDiners;
    
    let discountAmount = 0;
    let vatExemption = 0;
    let vatExemptSale = 0;
    
    if (config.isVATExempt) {
      vatExemptSale = perPersonGrossShare / (1 + this.VAT_RATE);
      vatExemption = perPersonGrossShare - vatExemptSale;
      discountAmount = vatExemptSale * config.rate;
    } else if (type === 'complimentary') {
      discountAmount = perPersonGrossShare;
    } else if (type === 'custom' && customPercentage) {
      discountAmount = perPersonGrossShare * (customPercentage / 100);
    } else {
      discountAmount = perPersonGrossShare * config.rate;
    }
    
    return {
      perPersonGrossShare,
      vatExemptSale,
      vatExemption,
      discountAmount,
      personPays: perPersonGrossShare - vatExemption - discountAmount,
      isVATExempt: config.isVATExempt
    };
  }

  static getEmptyCalculations(): CartCalculations {
    return {
      grossSubtotal: 0,
      netAmount: 0,
      standardVAT: 0,
      vatExemption: 0,
      adjustedVAT: 0,
      seniorDiscountAmount: 0,
      otherDiscountAmount: 0,
      totalDiscountAmount: 0,
      finalTotal: 0,
      vatableSales: 0,
      vatExemptSales: 0,
      zeroRatedSales: 0,
      totalDiners: 1,
      numberOfSeniors: 0,
      beneficiaryBreakdown: [],
      regularDinerCount: 1
    };
  }
}
