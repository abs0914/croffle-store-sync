import { CartItem } from "@/types";
import { BOGOService } from "./BOGOService";

export interface SeniorDiscount {
  id: string;
  idNumber: string;
  name: string;
  discountAmount: number;
}

export interface OtherDiscount {
  type: 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary' | 'bogo';
  amount: number;
  idNumber?: string;
  justification?: string;
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
  bogoDiscountAmount?: number; // BOGO promotion discount
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
    totalDiners: number = 1,
    applyAutoBOGO: boolean = true
  ): CartCalculations {
    console.log("🧮 CartCalculationService: Starting calculation", {
      itemsCount: items.length,
      items: items.map(i => ({ price: i.price, qty: i.quantity, total: i.price * i.quantity })),
      seniorDiscountsCount: seniorDiscounts.length,
      otherDiscount,
      totalDiners
    });
    
    // Basic calculations - amounts are VAT-inclusive (standard POS behavior)
    const grossSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    console.log("🧮 CartCalculationService: Gross subtotal calculated", grossSubtotal);
    
    const numberOfSeniors = seniorDiscounts.length;
    const effectiveTotalDiners = Math.max(totalDiners, numberOfSeniors);
    
    // BIR-compliant senior discount calculations
    let vatExemption = 0;
    let seniorDiscountAmount = 0;
    let vatableSales = grossSubtotal;
    let vatExemptSales = 0;
    let netAmount = grossSubtotal / (1 + this.VAT_RATE); // VAT-exclusive base
    
    if (numberOfSeniors > 0 && effectiveTotalDiners > 0) {
      // Step 1: Calculate per-person gross share (VAT-inclusive)
      const perPersonGrossShare = grossSubtotal / effectiveTotalDiners;
      
      // Step 2: Calculate senior portion (VAT-inclusive)
      const seniorPortionGross = perPersonGrossShare * numberOfSeniors;
      
      // Step 3: Calculate VAT-exempt amount for senior portion
      // BIR Formula: VAT-Exempt Sale = Gross Selling Price ÷ (1 + VAT Rate)
      const seniorPortionVATExempt = seniorPortionGross / (1 + this.VAT_RATE);
      
      // Step 4: Calculate VAT exemption (VAT not collected on senior portion)
      vatExemption = seniorPortionGross - seniorPortionVATExempt;
      
      // Step 5: Calculate 20% discount on VAT-exempt amount
      // BIR Formula: 20% Discount = VAT-Exempt Sale × 0.20
      seniorDiscountAmount = seniorPortionVATExempt * this.SENIOR_DISCOUNT_RATE;
      
      // For BIR reporting breakdown
      vatExemptSales = seniorPortionVATExempt;
      
      // Vatable sales = non-senior portion (still subject to VAT)
      const nonSeniorPortionGross = grossSubtotal - seniorPortionGross;
      vatableSales = nonSeniorPortionGross;
      
      // Adjust net amount calculation
      const nonSeniorPortionNet = nonSeniorPortionGross / (1 + this.VAT_RATE);
      netAmount = seniorPortionVATExempt + nonSeniorPortionNet;
    }
    
    // Other discount calculations
    let otherDiscountAmount = 0;
    let bogoDiscountAmount = 0;
    
    // Check for automatic BOGO promotion first
    if (applyAutoBOGO) {
      const bogoResult = BOGOService.analyzeBOGO(items);
      if (bogoResult.hasEligibleItems) {
        bogoDiscountAmount = bogoResult.discountAmount;
        console.log("🎁 CartCalculation: Auto-applied BOGO discount", bogoDiscountAmount);
      }
    }
    
    if (otherDiscount) {
      const discountSubtotal = grossSubtotal > 0 ? grossSubtotal : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      switch (otherDiscount.type) {
        case 'pwd':
          otherDiscountAmount = discountSubtotal * this.PWD_DISCOUNT_RATE;
          break;
        case 'employee':
          otherDiscountAmount = discountSubtotal * this.EMPLOYEE_DISCOUNT_RATE;
          break;
        case 'loyalty':
          otherDiscountAmount = discountSubtotal * this.LOYALTY_DISCOUNT_RATE;
          break;
        case 'promo':
          otherDiscountAmount = otherDiscount.amount;
          break;
        case 'complimentary':
          otherDiscountAmount = discountSubtotal; // 100% discount
          break;
        case 'bogo':
          otherDiscountAmount = otherDiscount.amount;
          break;
      }
    }
    
    // Final calculations
    const standardVAT = grossSubtotal * this.VAT_RATE / (1 + this.VAT_RATE);
    const adjustedVAT = Math.max(0, standardVAT - vatExemption);
    const totalDiscountAmount = seniorDiscountAmount + otherDiscountAmount + bogoDiscountAmount;
    const finalTotal = grossSubtotal - vatExemption - seniorDiscountAmount - otherDiscountAmount - bogoDiscountAmount;
    
    const result = {
      grossSubtotal,
      netAmount,
      standardVAT,
      vatExemption,
      adjustedVAT,
      seniorDiscountAmount,
      otherDiscountAmount: otherDiscountAmount + bogoDiscountAmount, // Combine for display
      totalDiscountAmount,
      finalTotal,
      vatableSales,
      vatExemptSales,
      zeroRatedSales: 0,
      totalDiners: effectiveTotalDiners,
      numberOfSeniors,
      bogoDiscountAmount // Add BOGO amount for detailed breakdown
    };
    
    console.log("🧮 CartCalculationService: Final result", result);
    return result;
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
        totalVATExemption: 0,
        perSeniorPays: 0
      };
    }

    const perPersonGrossShare = grossSubtotal / totalDiners;
    const perSeniorVATExemptSale = perPersonGrossShare / (1 + this.VAT_RATE);
    const perSeniorVATExemption = perPersonGrossShare - perSeniorVATExemptSale;
    const perSeniorDiscountAmount = perSeniorVATExemptSale * this.SENIOR_DISCOUNT_RATE;
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
}
