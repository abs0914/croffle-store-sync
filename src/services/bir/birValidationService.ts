import { Store } from "@/types/store";
import { Transaction } from "@/types/transaction";

export interface BIRValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export class BIRValidationService {
  /**
   * Validate store BIR compliance fields
   */
  static validateStore(store: Store): BIRValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Required BIR fields validation
    if (!store.tin) {
      errors.push('TIN (Taxpayer Identification Number) is required');
    } else if (!/^\d{9}|\d{12}$/.test(store.tin.replace(/-/g, ''))) {
      errors.push('TIN format is invalid (should be 9 or 12 digits)');
    }

    if (!store.business_name) {
      errors.push('Business Name is required for BIR compliance');
    }

    if (!store.machine_accreditation_number) {
      errors.push('Machine Accreditation Number is required');
    } else if (!/^MAN-\d{10}$/.test(store.machine_accreditation_number)) {
      warnings.push('Machine Accreditation Number format may be invalid (expected: MAN-XXXXXXXXXX)');
    }

    if (!store.machine_serial_number) {
      errors.push('Machine Serial Number is required');
    }

    if (!store.permit_number) {
      errors.push('Permit Number is required');
    }

    if (!store.date_issued) {
      warnings.push('Date Issued is not set');
    }

    if (!store.valid_until) {
      warnings.push('Valid Until date is not set');
    } else {
      const validUntil = new Date(store.valid_until);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (validUntil < today) {
        errors.push('BIR accreditation has expired');
      } else if (daysUntilExpiry <= 30) {
        warnings.push(`BIR accreditation expires in ${daysUntilExpiry} days`);
        recommendations.push('Renew BIR accreditation before expiry');
      }
    }

    if (!store.pos_version) {
      warnings.push('POS Version not specified');
    }

    // Address validation for BIR
    if (!store.address) {
      errors.push('Complete business address is required');
    }

    // Recommendations
    if (errors.length === 0) {
      recommendations.push('Store BIR compliance fields are properly configured');
    }

    if (!store.logo_url) {
      recommendations.push('Add store logo for professional receipts');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Validate transaction BIR compliance
   */
  static validateTransaction(transaction: Transaction): BIRValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Receipt number validation
    if (!transaction.receiptNumber) {
      errors.push('Receipt number is required');
    } else if (!/^\d{8}-\d{4}-\d{6}$/.test(transaction.receiptNumber)) {
      warnings.push('Receipt number format may not comply with BIR standards (expected: YYYYMMDD-NNNN-HHMMSS)');
    }

    // Sequence number validation
    if (!transaction.sequence_number) {
      errors.push('Sequence number is required for BIR compliance');
    }

    // Terminal ID validation
    if (!transaction.terminal_id) {
      errors.push('Terminal ID is required');
    }

    // VAT calculation validation
    if (transaction.vat_sales !== undefined && transaction.tax !== undefined) {
      const expectedVAT = transaction.vat_sales * 0.12;
      const difference = Math.abs(transaction.tax - expectedVAT);
      
      if (difference > 0.01) { // Allow 1 centavo tolerance
        errors.push(`VAT calculation error: Expected ₱${expectedVAT.toFixed(2)}, got ₱${transaction.tax.toFixed(2)}`);
      }
    } else {
      errors.push('VAT sales and VAT amount calculations are required');
    }

    // Discount validation
    if (transaction.discountType === 'senior' || transaction.discountType === 'pwd') {
      if (!transaction.discountIdNumber) {
        errors.push(`${transaction.discountType.toUpperCase()} ID number is required for discount`);
      }
      
      if (transaction.senior_citizen_discount === undefined && transaction.discountType === 'senior') {
        warnings.push('Senior citizen discount amount not properly tracked');
      }
      
      if (transaction.pwd_discount === undefined && transaction.discountType === 'pwd') {
        warnings.push('PWD discount amount not properly tracked');
      }
    }

    // Payment method validation
    if (!['cash', 'card', 'e-wallet'].includes(transaction.paymentMethod)) {
      warnings.push('Payment method should be standardized (cash, card, or e-wallet)');
    }

    // Items validation
    if (!transaction.items || transaction.items.length === 0) {
      errors.push('Transaction must have at least one item');
    } else {
      transaction.items.forEach((item, index) => {
        if (!item.name) {
          errors.push(`Item ${index + 1} missing name/description`);
        }
        if (item.quantity <= 0) {
          errors.push(`Item ${index + 1} has invalid quantity`);
        }
        if (item.unitPrice <= 0) {
          errors.push(`Item ${index + 1} has invalid unit price`);
        }
      });
    }

    // Amount validation
    const calculatedSubtotal = transaction.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
    if (Math.abs(calculatedSubtotal - transaction.subtotal) > 0.01) {
      errors.push('Subtotal does not match sum of item totals');
    }

    const expectedTotal = transaction.subtotal - (transaction.discount || 0);
    if (Math.abs(expectedTotal - transaction.total) > 0.01) {
      errors.push('Total amount calculation error');
    }

    // Change validation for cash payments
    if (transaction.paymentMethod === 'cash') {
      if (transaction.amountTendered === undefined) {
        warnings.push('Amount tendered not recorded for cash payment');
      } else if (transaction.amountTendered < transaction.total) {
        errors.push('Amount tendered is less than total amount due');
      } else {
        const expectedChange = transaction.amountTendered - transaction.total;
        if (transaction.change !== undefined && Math.abs(transaction.change - expectedChange) > 0.01) {
          errors.push('Change calculation error');
        }
      }
    }

    // Recommendations
    if (errors.length === 0) {
      recommendations.push('Transaction BIR compliance is valid');
    }

    if (transaction.paymentMethod === 'cash' && transaction.amountTendered === transaction.total) {
      recommendations.push('Consider implementing exact change tracking for better customer service');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Validate receipt number format and sequence
   */
  static validateReceiptSequence(receipts: string[]): BIRValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (receipts.length === 0) {
      warnings.push('No receipts to validate');
      return { isValid: true, errors, warnings, recommendations };
    }

    // Sort receipts by date and sequence
    const sortedReceipts = receipts.sort();
    
    // Check for gaps in sequence
    const sequences = sortedReceipts.map(receipt => {
      const parts = receipt.split('-');
      if (parts.length !== 3) return null;
      return {
        date: parts[0],
        sequence: parseInt(parts[1]),
        time: parts[2],
        full: receipt
      };
    }).filter(Boolean);

    // Group by date
    const dateGroups = sequences.reduce((groups, receipt) => {
      if (!receipt) return groups;
      if (!groups[receipt.date]) {
        groups[receipt.date] = [];
      }
      groups[receipt.date].push(receipt);
      return groups;
    }, {} as Record<string, any[]>);

    // Check sequence continuity within each date
    Object.entries(dateGroups).forEach(([date, dayReceipts]) => {
      dayReceipts.sort((a, b) => a.sequence - b.sequence);
      
      for (let i = 1; i < dayReceipts.length; i++) {
        const prev = dayReceipts[i - 1];
        const curr = dayReceipts[i];
        
        if (curr.sequence !== prev.sequence + 1) {
          warnings.push(`Sequence gap detected on ${date}: ${prev.sequence} -> ${curr.sequence}`);
        }
      }
    });

    // Validate format
    const invalidFormats = receipts.filter(receipt => !/^\d{8}-\d{4}-\d{6}$/.test(receipt));
    if (invalidFormats.length > 0) {
      errors.push(`${invalidFormats.length} receipts have invalid format`);
      recommendations.push('Ensure all receipt numbers follow YYYYMMDD-NNNN-HHMMSS format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }
}