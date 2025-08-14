import { toast } from "sonner";

export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PaymentDetails {
  cardType?: string;
  cardNumber?: string;
  eWalletProvider?: string;
  eWalletReferenceNumber?: string;
}

/**
 * Production-ready payment validation service
 * Validates payment details before processing transactions
 */
export class PaymentValidationService {
  
  /**
   * Validates cash payment
   */
  static validateCashPayment(
    total: number,
    amountTendered: number
  ): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation
    if (total <= 0) {
      errors.push("Invalid transaction total");
    }
    
    if (amountTendered <= 0) {
      errors.push("Amount tendered must be greater than zero");
    }
    
    if (amountTendered < total) {
      errors.push("Insufficient payment amount");
    }
    
    // Warnings for large amounts
    if (amountTendered > 10000) {
      warnings.push("Large cash transaction - verify amount");
    }
    
    const change = amountTendered - total;
    if (change > 5000) {
      warnings.push("Large change amount - ensure sufficient cash in register");
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validates card payment details
   */
  static validateCardPayment(
    total: number,
    paymentDetails?: PaymentDetails
  ): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (total <= 0) {
      errors.push("Invalid transaction total");
    }
    
    if (!paymentDetails?.cardType) {
      errors.push("Card type is required");
    }
    
    if (!paymentDetails?.cardNumber) {
      errors.push("Card number (last 4 digits) is required");
    } else {
      // Validate card number format (last 4 digits)
      const cardNumberPattern = /^\d{4}$/;
      if (!cardNumberPattern.test(paymentDetails.cardNumber)) {
        errors.push("Card number must be exactly 4 digits");
      }
    }
    
    // Validate card type
    const validCardTypes = ['Visa', 'MasterCard', 'Other'];
    if (paymentDetails?.cardType && !validCardTypes.includes(paymentDetails.cardType)) {
      warnings.push("Unrecognized card type");
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validates e-wallet payment details
   */
  static validateEWalletPayment(
    total: number,
    paymentDetails?: PaymentDetails
  ): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (total <= 0) {
      errors.push("Invalid transaction total");
    }
    
    if (!paymentDetails?.eWalletProvider) {
      errors.push("E-wallet provider is required");
    }
    
    if (!paymentDetails?.eWalletReferenceNumber) {
      errors.push("Reference number is required for e-wallet payments");
    } else {
      // Validate reference number format
      const refNumber = paymentDetails.eWalletReferenceNumber.trim();
      if (refNumber.length < 6) {
        errors.push("Reference number must be at least 6 characters");
      }
      if (refNumber.length > 50) {
        errors.push("Reference number is too long");
      }
    }
    
    // Validate e-wallet provider
    const validProviders = ['GCash', 'Maya', 'Other'];
    if (paymentDetails?.eWalletProvider && !validProviders.includes(paymentDetails.eWalletProvider)) {
      warnings.push("Unrecognized e-wallet provider");
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Comprehensive payment validation
   */
  static validatePayment(
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    total: number,
    amountTendered: number,
    paymentDetails?: PaymentDetails
  ): PaymentValidationResult {
    let result: PaymentValidationResult;
    
    switch (paymentMethod) {
      case 'cash':
        result = this.validateCashPayment(total, amountTendered);
        break;
      case 'card':
        result = this.validateCardPayment(total, paymentDetails);
        break;
      case 'e-wallet':
        result = this.validateEWalletPayment(total, paymentDetails);
        break;
      default:
        result = {
          isValid: false,
          errors: ['Invalid payment method'],
          warnings: []
        };
    }
    
    // Display validation results
    if (result.errors.length > 0) {
      toast.error(`Payment validation failed: ${result.errors.join(', ')}`);
    }
    
    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => toast.warning(warning));
    }
    
    return result;
  }
  
  /**
   * Simulates payment processing (replace with actual payment gateway)
   */
  static async processPayment(
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    total: number,
    paymentDetails?: PaymentDetails
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log('🔄 Processing payment:', { paymentMethod, total, paymentDetails });
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock payment processing logic
      // In production, this would integrate with actual payment gateways
      switch (paymentMethod) {
        case 'cash':
          // Cash payments are always successful if validation passed
          return {
            success: true,
            transactionId: `CASH-${Date.now()}`
          };
          
        case 'card':
          // Simulate card processing
          // In production: integrate with payment gateway (Stripe, PayPal, etc.)
          if (Math.random() > 0.05) { // 95% success rate simulation
            return {
              success: true,
              transactionId: `CARD-${Date.now()}`
            };
          } else {
            return {
              success: false,
              error: 'Card transaction declined'
            };
          }
          
        case 'e-wallet':
          // Simulate e-wallet processing
          // In production: integrate with GCash, Maya, etc. APIs
          if (Math.random() > 0.03) { // 97% success rate simulation
            return {
              success: true,
              transactionId: `EWALLET-${Date.now()}`
            };
          } else {
            return {
              success: false,
              error: 'E-wallet transaction failed'
            };
          }
          
        default:
          return {
            success: false,
            error: 'Unsupported payment method'
          };
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }
}