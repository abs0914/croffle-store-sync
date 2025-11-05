import { CartItem } from "@/types";
import { BOGOService } from "./BOGOService";
import { CroffleComboPromoService } from "./CroffleComboPromoService";

export interface SeniorDiscount {
  id: string;
  idNumber: string;
  name: string;
  discountAmount: number;
}

export interface OtherDiscount {
  type: 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary' | 'bogo' | 'croffle_combo';
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
    // Validate all items have valid prices (allow zero for free items)
    const invalidItems = items.filter(i => i.price == null || i.price < 0 || !i.quantity || i.quantity <= 0);
    if (invalidItems.length > 0) {
      console.error("❌ CartCalculationService: Items without valid prices/quantities:", invalidItems);
      return this.getEmptyCalculations();
    }
    
    console.log("🧮 CartCalculationService: Starting calculation", {
      itemsCount: items.length,
      items: items.map(i => ({ 
        productId: i.productId,
        name: i.product?.name,
        price: i.price, 
        qty: i.quantity, 
        total: i.price * i.quantity
      })),
      seniorDiscountsCount: seniorDiscounts.length,
      otherDiscount,
      totalDiners
    });
    
    // Basic calculations - amounts are VAT-inclusive (standard POS behavior)
    const grossSubtotal = items.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      return sum + itemTotal;
    }, 0);
    
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
    
    // BOGO automatic calculation
    const bogoResult = BOGOService.analyzeBOGO(items);
    const bogoDiscountAmount = bogoResult.discountAmount;
    
    // Croffle Combo automatic calculation
    const comboResult = CroffleComboPromoService.analyzeCombo(items);
    const comboDiscountAmount = comboResult.discountAmount;
    
    // Other discount calculations
    let otherDiscountAmount = 0;
    
    if (otherDiscount) {
      const discountSubtotal = grossSubtotal > 0 ? grossSubtotal : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      switch (otherDiscount.type) {
        case 'pwd':
          // PWD discount: Calculate on VAT-exclusive amount (BIR compliance)
          // Step 1: Remove VAT from gross price
          const pwdNetAmount = discountSubtotal / (1 + this.VAT_RATE);
          
          // Step 2: Apply 20% discount on VAT-exclusive amount
          otherDiscountAmount = pwdNetAmount * this.PWD_DISCOUNT_RATE;
          
          // Step 3: PWD transactions are VAT-exempt (no VAT collected)
          vatExemption = discountSubtotal - pwdNetAmount; // Full VAT exemption
          vatExemptSales = pwdNetAmount; // For BIR reporting
          vatableSales = 0; // No vatable sales for PWD transactions
          netAmount = pwdNetAmount; // Update net amount
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
        case 'croffle_combo':
          otherDiscountAmount = otherDiscount.amount;
          break;
      }
    }
    
    // Add automatic promotions to other discount amount
    otherDiscountAmount += bogoDiscountAmount + comboDiscountAmount;
    
    // Final calculations
    const standardVAT = grossSubtotal * this.VAT_RATE / (1 + this.VAT_RATE);
    const adjustedVAT = Math.max(0, standardVAT - vatExemption);
    const totalDiscountAmount = seniorDiscountAmount + otherDiscountAmount;
    const finalTotal = grossSubtotal - vatExemption - seniorDiscountAmount - otherDiscountAmount;
    
    const result = {
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
      numberOfSeniors: 0
    };
  }
}
