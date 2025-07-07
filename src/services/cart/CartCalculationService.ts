import { CartItem } from "@/types";

export interface SeniorDiscount {
  id: string;
  idNumber: string;
  name: string;
  discountAmount: number;
}

export interface OtherDiscount {
  type: 'pwd' | 'employee' | 'loyalty' | 'promo';
  amount: number;
  idNumber?: string;
}

export interface CartCalculations {
  // Raw totals
  grossSubtotal: number; // VAT-inclusive total from items
  netAmount: number; // VAT-exclusive base amount
  
  // VAT calculations
  standardVAT: number; // VAT on full amount
  vatExemption: number; // VAT exempted due to senior discounts
  adjustedVAT: number; // VAT after exemptions
  
  // Discounts
  seniorDiscountAmount: number; // 20% on VAT-exempt portions
  otherDiscountAmount: number; // Other discounts
  totalDiscountAmount: number; // All discounts combined
  
  // Final totals
  finalTotal: number; // Amount to collect
  
  // Breakdown for BIR compliance
  vatableSales: number; // Sales subject to VAT
  vatExemptSales: number; // Sales exempt from VAT (senior portions)
  zeroRatedSales: number; // Zero-rated sales (always 0 for now)
  
  // Metadata
  totalDiners: number;
  numberOfSeniors: number;
}

export class CartCalculationService {
  private static readonly VAT_RATE = 0.12;
  private static readonly SENIOR_DISCOUNT_RATE = 0.20;
  private static readonly PWD_DISCOUNT_RATE = 0.20;
  private static readonly EMPLOYEE_DISCOUNT_RATE = 0.15;
  private static readonly LOYALTY_DISCOUNT_RATE = 0.10;

  static calculateCartTotals(
    items: CartItem[],
    seniorDiscounts: SeniorDiscount[] = [],
    otherDiscount?: OtherDiscount | null,
    totalDiners: number = 1
  ): CartCalculations {
    // Basic calculations
    const grossSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const netAmount = grossSubtotal / (1 + this.VAT_RATE);
    const standardVAT = grossSubtotal - netAmount;
    
    const numberOfSeniors = seniorDiscounts.length;
    const effectiveTotalDiners = Math.max(totalDiners, numberOfSeniors);
    
    // Senior discount calculations (BIR-compliant)
    let vatExemption = 0;
    let seniorDiscountAmount = 0;
    let vatableSales = grossSubtotal;
    let vatExemptSales = 0;
    
    if (numberOfSeniors > 0 && effectiveTotalDiners > 0) {
      // Per-person gross share
      const perPersonGrossShare = grossSubtotal / effectiveTotalDiners;
      
      // Senior portion calculations
      const seniorPortionGross = perPersonGrossShare * numberOfSeniors;
      const seniorPortionVATExempt = seniorPortionGross / (1 + this.VAT_RATE);
      
      // VAT exemption = VAT that would have been paid on senior portions
      vatExemption = seniorPortionGross - seniorPortionVATExempt;
      
      // Senior discount = 20% of VAT-exempt amount
      seniorDiscountAmount = seniorPortionVATExempt * this.SENIOR_DISCOUNT_RATE;
      
      // For BIR reporting
      vatExemptSales = seniorPortionVATExempt;
      vatableSales = grossSubtotal - seniorPortionGross;
    }
    
    // Other discount calculations
    let otherDiscountAmount = 0;
    if (otherDiscount) {
      switch (otherDiscount.type) {
        case 'pwd':
          otherDiscountAmount = grossSubtotal * this.PWD_DISCOUNT_RATE;
          break;
        case 'employee':
          otherDiscountAmount = grossSubtotal * this.EMPLOYEE_DISCOUNT_RATE;
          break;
        case 'loyalty':
          otherDiscountAmount = grossSubtotal * this.LOYALTY_DISCOUNT_RATE;
          break;
        case 'promo':
          otherDiscountAmount = otherDiscount.amount;
          break;
      }
    }
    
    // Final calculations
    const adjustedVAT = Math.max(0, standardVAT - vatExemption);
    const totalDiscountAmount = seniorDiscountAmount + otherDiscountAmount;
    const finalTotal = grossSubtotal - vatExemption - seniorDiscountAmount - otherDiscountAmount;
    
    return {
      grossSubtotal,
      netAmount,
      standardVAT,
      vatExemption,
      adjustedVAT,
      seniorDiscountAmount,
      otherDiscountAmount,
      totalDiscountAmount,
      finalTotal,
      vatableSales,
      vatExemptSales,
      zeroRatedSales: 0,
      totalDiners: effectiveTotalDiners,
      numberOfSeniors
    };
  }

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
        perSeniorPays: 0
      };
    }

    const perPersonGrossShare = grossSubtotal / totalDiners;
    const perSeniorVATExemptSale = perPersonGrossShare / (1 + this.VAT_RATE);
    const perSeniorDiscountAmount = perSeniorVATExemptSale * this.SENIOR_DISCOUNT_RATE;
    const totalSeniorDiscount = perSeniorDiscountAmount * numberOfSeniors;
    const perSeniorPays = perSeniorVATExemptSale - perSeniorDiscountAmount;

    return {
      perPersonGrossShare,
      perSeniorVATExemptSale,
      perSeniorDiscountAmount,
      totalSeniorDiscount,
      perSeniorPays
    };
  }
}
