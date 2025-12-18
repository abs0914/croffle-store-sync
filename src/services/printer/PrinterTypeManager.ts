import { BluetoothPrinter, PrinterType, PrinterCapabilities, DEFAULT_THERMAL_CAPABILITIES, DEFAULT_DOT_MATRIX_CAPABILITIES } from '@/types/printer';
import { ESCPOSFormatter } from './ESCPOSFormatter';
import { DotMatrixFormatter } from './DotMatrixFormatter';
import { Transaction, Customer } from '@/types';
import { Store } from '@/types/store';

export class PrinterTypeManager {
  // Format TIN for BIR compliance
  private static formatTIN(tin?: string): string {
    if (!tin) return 'N/A';
    const cleaned = tin.replace(/\D/g, '');
    if (cleaned.length === 12) {
      return `${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6,9)}-${cleaned.slice(9)}`;
    }
    return tin;
  }

  // Helper to get discount label and percentage
  private static getDiscountLabelAndPercent(discountType: string): { label: string; percent: string } {
    switch (discountType) {
      case 'senior': return { label: 'SENIOR CITIZEN', percent: '20%' };
      case 'pwd': return { label: 'PWD', percent: '20%' };
      case 'naac':
      case 'athletes_coaches': return { label: 'NAAC', percent: '20%' };
      case 'solo_parent': return { label: 'SOLO PARENT', percent: '20%' };
      case 'employee': return { label: 'EMPLOYEE', percent: '15%' };
      case 'loyalty': return { label: 'LOYALTY', percent: '10%' };
      case 'regular': return { label: 'REGULAR', percent: '5%' };
      case 'custom': return { label: 'CUSTOM', percent: '' };
      case 'complimentary': return { label: 'COMPLIMENTARY', percent: '100%' };
      case 'promo': return { label: 'PROMO', percent: '' };
      case 'bogo': return { label: 'BOGO', percent: '' };
      default: return { label: 'Discount', percent: '' };
    }
  }

  // Detect printer type based on device characteristics
  static detectPrinterType(printer: BluetoothPrinter): PrinterType {
    const name = printer.name.toLowerCase();
    
    // Common thermal printer identifiers
    const thermalKeywords = [
      'pos', 'thermal', 'receipt', 'xprinter', 'sunmi', 'epson tm',
      'citizen ct', 'star tsp', 'bixolon srp', 'custom vkp'
    ];
    
    // Common dot matrix printer identifiers
    const dotMatrixKeywords = [
      'dot matrix', 'impact', 'epson lx', 'epson fx', 'oki microline',
      'panasonic kx', 'citizen gsx', 'star dp', 'lq-', 'fx-', 'lx-'
    ];
    
    // Check for thermal printer indicators
    for (const keyword of thermalKeywords) {
      if (name.includes(keyword)) {
        return 'thermal';
      }
    }
    
    // Check for dot matrix printer indicators
    for (const keyword of dotMatrixKeywords) {
      if (name.includes(keyword)) {
        return 'dot-matrix';
      }
    }
    
    // Default assumption based on Bluetooth characteristics
    // Most modern Bluetooth printers are thermal
    return 'thermal';
  }

  // Get capabilities for a printer type
  static getCapabilities(printerType: PrinterType): PrinterCapabilities {
    switch (printerType) {
      case 'thermal':
        return DEFAULT_THERMAL_CAPABILITIES;
      case 'dot-matrix':
        return DEFAULT_DOT_MATRIX_CAPABILITIES;
      default:
        return DEFAULT_THERMAL_CAPABILITIES; // Safe default
    }
  }

  // Format receipt based on printer type
  static formatReceipt(
    printer: BluetoothPrinter,
    transaction: Transaction,
    customer?: Customer | null,
    store?: Store,
    cashierName?: string,
    isReprint?: boolean
  ): string {
    const printerType = printer.printerType || 'thermal';
    
    if (printerType === 'dot-matrix') {
      return this.formatDotMatrixReceipt(transaction, customer, store, cashierName, isReprint);
    } else {
      return this.formatThermalReceipt(transaction, customer, store, cashierName, isReprint);
    }
  }

  // Format test receipt based on printer type
  static formatTestReceipt(printer: BluetoothPrinter): string {
    const printerType = printer.printerType || 'thermal';
    
    if (printerType === 'dot-matrix') {
      return this.formatDotMatrixTestReceipt();
    } else {
      return this.formatThermalTestReceipt();
    }
  }

  // Format Z-Reading based on printer type
  static formatZReading(printer: BluetoothPrinter, zReadingData: any, isReprint?: boolean): string {
    const printerType = printer.printerType || 'thermal';
    
    if (printerType === 'dot-matrix') {
      return this.formatDotMatrixZReading(zReadingData, isReprint);
    } else {
      return this.formatThermalZReading(zReadingData, isReprint);
    }
  }

  // Format X-Reading based on printer type
  static formatXReading(printer: BluetoothPrinter, xReadingData: any, isReprint?: boolean): string {
    const printerType = printer.printerType || 'thermal';
    
    if (printerType === 'dot-matrix') {
      return this.formatDotMatrixXReading(xReadingData, isReprint);
    } else {
      return this.formatThermalXReading(xReadingData, isReprint);
    }
  }

  // Private methods for specific printer formatting
  private static formatThermalReceipt(
    transaction: Transaction,
    customer?: Customer | null,
    store?: Store,
    cashierName?: string,
    isReprint?: boolean
  ): string {
    const formatter = ESCPOSFormatter;
    const width = 32;
    
    let receipt = formatter.init();
    
    // BIR Requirement: REPRINT watermark with date/time
    if (isReprint) {
      receipt += formatter.center();
      receipt += formatter.doubleSize();
      receipt += formatter.bold('*** REPRINT ***') + '\n';
      receipt += formatter.normalSize();
      receipt += `Reprinted: ${new Date().toLocaleString()}\n`;
      receipt += formatter.horizontalLine(width);
      receipt += formatter.left();
    }
    
    // Header - Show both Store Name and Business Name
    if (store) {
      receipt += formatter.center();
      // Show Store Name (branch/location) first
      if (store.name) {
        receipt += formatter.bold(store.name) + '\n';
      }
      // Show Business Name (registered taxpayer name) second
      if (store.business_name && store.business_name !== store.name) {
        receipt += store.business_name + '\n';
      } else if (!store.name && store.business_name) {
        receipt += formatter.bold(store.business_name) + '\n';
      }
      if (store.address) {
        receipt += store.address + '\n';
      }
      if (store.phone) {
        receipt += store.phone + '\n';
      }
      
      // BIR: VAT Registration Status with TIN format
      if (store.is_vat_registered) {
        receipt += `VAT REG. TIN: ${this.formatTIN(store.tin)}\n`;
      } else if (store.tin) {
        receipt += `NON-VAT REG. TIN: ${this.formatTIN(store.tin)}\n`;
      }
      
      // BIR: Machine Identification Number (MIN)
      if (store.machine_accreditation_number) {
        receipt += `MIN: ${store.machine_accreditation_number}\n`;
      }
      
      // BIR: Serial Number of sales machine
      if (store.machine_serial_number) {
        receipt += `S/N: ${store.machine_serial_number}\n`;
      }
      
      receipt += formatter.left();
    }
    
    // BIR: SALES INVOICE header
    receipt += formatter.center();
    receipt += formatter.bold('SALES INVOICE') + '\n';
    receipt += formatter.left();
    receipt += formatter.horizontalLine(width);
    
    // Receipt info - SI No instead of Receipt #
    receipt += formatter.formatLine('SI No:', transaction.receiptNumber || 'N/A', width);
    receipt += formatter.formatLine('Date:', new Date(transaction.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }), width);
    receipt += formatter.formatLine('Time:', new Date(transaction.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }), width);
    receipt += formatter.formatLine('Cashier:', cashierName || 'Unknown', width);
    
    // Order Type Information
    const orderType = (transaction as any).orderType || (transaction as any).order_type;
    if (orderType === 'online_delivery') {
      receipt += formatter.formatLine('Order Type:', 'Online Delivery', width);
      const platform = (transaction as any).deliveryPlatform || (transaction as any).delivery_platform;
      if (platform === 'grab_food') {
        receipt += formatter.formatLine('Platform:', 'Grab Food', width);
      } else if (platform === 'food_panda') {
        receipt += formatter.formatLine('Platform:', 'FoodPanda', width);
      }
      const deliveryOrderNo = (transaction as any).deliveryOrderNumber || (transaction as any).delivery_order_number;
      if (deliveryOrderNo) {
        receipt += formatter.formatLine('Order No:', deliveryOrderNo, width);
      }
    } else if (orderType === 'takeout') {
      receipt += formatter.formatLine('Order Type:', 'Take Out', width);
    } else {
      receipt += formatter.formatLine('Order Type:', 'Dine In', width);
    }
    
    receipt += formatter.horizontalLine(width);
    
    // BIR: Item Table Header
    receipt += formatter.formatItemHeader(width);
    receipt += formatter.horizontalLine(width);
    
    // Items
    transaction.items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      receipt += formatter.formatItemLine(
        item.name,
        formatter.formatCurrencyWithSymbol(item.unitPrice),
        item.quantity,
        formatter.formatCurrencyWithSymbol(itemTotal),
        width
      );
    });
    
    // BIR Totals Section
    receipt += formatter.horizontalLine(width);
    
    // Calculate VAT values - with robust fallbacks for missing subtotal
    // Priority: 1) transaction.subtotal 2) sum from items 3) infer from total + discount
    let grossAmount = transaction.subtotal;
    
    // Fallback: calculate from items if subtotal is missing
    if (!grossAmount || grossAmount <= 0) {
      grossAmount = transaction.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
    }
    
    // Fallback: infer from total + discount if still missing
    if (!grossAmount || grossAmount <= 0) {
      const totalDiscount = transaction.discount || 
        (transaction as any).discount_amount || 
        transaction.senior_citizen_discount || 
        transaction.pwd_discount || 0;
      grossAmount = (transaction.total || 0) + totalDiscount;
    }
    
    const vatAmount = transaction.tax || (grossAmount > 0 ? grossAmount / 1.12 * 0.12 : 0);
    const netOfVat = grossAmount > 0 ? grossAmount - vatAmount : 0;

    // Discount amount can live in multiple fields depending on source (POS vs reports/reprint)
    const discountAmountFromRecord =
      transaction.discount ||
      (transaction as any).discount_amount ||
      transaction.senior_citizen_discount ||
      transaction.pwd_discount ||
      0;

    // Determine VAT-exempt and vatable amounts based on discount type
    const discountType = transaction.discountType || (transaction as any).discount_type || '';
    const isVatExempt = ['senior', 'pwd', 'naac', 'athletes_coaches', 'solo_parent'].includes(discountType);

    // Parse discount_beneficiaries (may be string or array)
    const parseBeneficiaries = (value: any): any[] => {
      if (!value) return [];
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return Array.isArray(value) ? value : [];
    };

    const parsedBeneficiaries = parseBeneficiaries((transaction as any).discount_beneficiaries);

    // Prefer beneficiary sums when available; otherwise fall back to record-level discount
    const beneficiariesTotalDiscount = parsedBeneficiaries.reduce((sum: number, b: any) => {
      const amt = b?.discountAmount ?? b?.discount_amount ?? 0;
      return sum + (typeof amt === 'number' ? amt : 0);
    }, 0);

    let totalDiscount = beneficiariesTotalDiscount > 0 ? beneficiariesTotalDiscount : discountAmountFromRecord;

    // Last-resort: infer discount impact from totals when record fields are missing
    // (common on some historical transactions/reprints)
    if (totalDiscount === 0) {
      const inferred = Math.max(0, grossAmount - transaction.total);
      if (inferred > 0) totalDiscount = inferred;
    }

    // Check if any beneficiary has VAT-exempt discount type
    const hasVatExemptBeneficiary = parsedBeneficiaries.some((b: any) => 
      ['senior', 'pwd', 'naac', 'athletes_coaches', 'solo_parent'].includes(b.type)
    );
    
    let vatableSales = 0;
    let vatExemptSales = 0;
    let zeroRatedSales = 0;
    let finalVat = vatAmount;
    
    if ((isVatExempt || hasVatExemptBeneficiary) && (totalDiscount > 0 || parsedBeneficiaries.length > 0)) {
      // For VAT-exempt discounts, the discounted portion becomes VAT-exempt
      vatExemptSales = netOfVat;
      vatableSales = 0;
      finalVat = 0;
    } else {
      vatableSales = netOfVat;
      vatExemptSales = 0;
    }
    
    // BIR Format: Total Sales → Less VAT → Net of VAT → Discount → Add VAT → Total Due
    receipt += formatter.formatLine('Total Sales:', formatter.formatCurrencyWithSymbol(grossAmount), width);
    receipt += formatter.formatLine('Less 12% VAT:', formatter.formatCurrencyWithSymbol(vatAmount), width);
    receipt += formatter.formatLine('Amt. Net of VAT:', formatter.formatCurrencyWithSymbol(netOfVat), width);
    
    // Discount section - show each beneficiary's discount separately
    if (parsedBeneficiaries.length > 0) {
      // Multi-beneficiary: show each discount line
      parsedBeneficiaries.forEach((beneficiary: any) => {
        const discountAmount = beneficiary.discountAmount || beneficiary.discount_amount || 0;
        if (discountAmount > 0) {
          const { label, percent } = this.getDiscountLabelAndPercent(beneficiary.type);
          const fullLabel = percent ? `${label} ${percent}:` : `${label}:`;
          receipt += formatter.formatLine(fullLabel, formatter.formatCurrencyWithSymbol(-discountAmount), width);
        }
      });
    } else if (totalDiscount > 0) {
      // Single discount type fallback
      const { label, percent } = this.getDiscountLabelAndPercent(discountType);
      const fullLabel = percent ? `${label} ${percent}:` : `${label}:`;
      receipt += formatter.formatLine(fullLabel, formatter.formatCurrencyWithSymbol(-totalDiscount), width);
    }
    
    // Add VAT (for non-exempt transactions)
    const shouldShowAddVat = !isVatExempt && !hasVatExemptBeneficiary;
    if (shouldShowAddVat || (totalDiscount === 0 && parsedBeneficiaries.length === 0)) {
      receipt += formatter.formatLine('Add VAT:', formatter.formatCurrencyWithSymbol(finalVat), width);
    }
    
    receipt += formatter.horizontalLine(width);
    receipt += formatter.bold(formatter.formatLine('TOTAL AMOUNT DUE:', formatter.formatCurrencyWithSymbol(transaction.total), width));
    receipt += formatter.horizontalLine(width);
    
    // VAT Breakdown Section
    receipt += formatter.formatVATBreakdown(vatableSales, isVatExempt ? 0 : vatAmount, vatExemptSales, zeroRatedSales, width);
    receipt += formatter.horizontalLine(width);
    
    // Payment Section
    const paymentMethod = transaction.paymentMethod?.toUpperCase() || 'CASH';
    receipt += formatter.formatLine('Payment Type:', paymentMethod, width);
    receipt += formatter.formatLine('Amount Paid:', formatter.formatCurrencyWithSymbol(transaction.amountTendered || transaction.total), width);
    
    // E-wallet Details (for e-wallet payments)
    if (paymentMethod === 'E-WALLET') {
      const paymentDetails = (transaction as any).paymentDetails || (transaction as any).payment_details || {};
      const provider = paymentDetails?.eWalletProvider || paymentDetails?.e_wallet_provider || paymentDetails?.provider || '';
      const refNumber = paymentDetails?.eWalletReferenceNumber || paymentDetails?.e_wallet_reference_number || paymentDetails?.referenceNumber || '';
      
      if (provider) {
        receipt += formatter.formatLine('Provider:', provider.toUpperCase(), width);
      }
      if (refNumber) {
        receipt += formatter.formatLine('Reference No:', refNumber, width);
      }
    }

    if (transaction.change && transaction.change > 0) {
      receipt += formatter.formatLine('Change:', formatter.formatCurrencyWithSymbol(transaction.change), width);
    }
    
    // Credit Card Details (for card payments)
    const paymentDetails = (transaction as any).paymentDetails || (transaction as any).payment_details;
    if (paymentMethod === 'CARD' || paymentMethod === 'CREDIT' || paymentMethod === 'DEBIT') {
      receipt += formatter.horizontalLine(width);
      const cardType = paymentDetails?.cardType || paymentDetails?.card_type || 'Credit Card';
      const cardNumber = paymentDetails?.cardNumber || paymentDetails?.card_number || paymentDetails?.lastFourDigits || '';
      const expiryDate = paymentDetails?.expiryDate || paymentDetails?.expiry_date;
      const approvalCode = paymentDetails?.approvalCode || paymentDetails?.approval_code || paymentDetails?.referenceNumber;
      
      receipt += formatter.formatCardDetails(cardType, cardNumber, expiryDate, approvalCode, width);
    }
    
    // Discount Beneficiary Info Section (for BIR-mandated discounts)
    // Collect all beneficiaries from multiple data sources
    const allBeneficiaries: Array<{type: string; name?: string; idNumber?: string; address?: string; tin?: string}> = [];
    
    // Check new unified discount_beneficiaries format first (may be string or array)
    const discountBeneficiaries = parsedBeneficiaries;
    if (discountBeneficiaries.length > 0) {
      discountBeneficiaries.forEach((b: any) => {
        if (['senior', 'pwd', 'naac', 'athletes_coaches', 'solo_parent'].includes(b.type)) {
          allBeneficiaries.push({
            type: b.type,
            name: b.name,
            idNumber: b.idNumber || b.id_number,
            address: b.address,
            tin: b.tin,
          });
        }
      });
    }
    
    // Fallback to legacy senior_discounts_detail
    const seniorDiscounts = (transaction as any).senior_discounts_detail || (transaction as any).seniorDiscounts;
    if (seniorDiscounts && Array.isArray(seniorDiscounts)) {
      seniorDiscounts.forEach((s: any) => {
        // Avoid duplicates
        if (!allBeneficiaries.some(b => b.type === 'senior' && b.idNumber === s.idNumber)) {
          allBeneficiaries.push({
            type: 'senior',
            name: s.name,
            idNumber: s.idNumber || s.id_number,
            address: s.address,
            tin: s.tin
          });
        }
      });
    }
    
    // Fallback to legacy other_discount_detail (PWD, NAAC, Solo Parent)
    const otherDiscount = (transaction as any).other_discount_detail || (transaction as any).otherDiscount;
    if (otherDiscount && typeof otherDiscount === 'object') {
      const otherType = otherDiscount.type;
      if (['pwd', 'naac', 'athletes_coaches', 'solo_parent'].includes(otherType)) {
        // Avoid duplicates
        if (!allBeneficiaries.some(b => b.type === otherType && b.idNumber === otherDiscount.idNumber)) {
          allBeneficiaries.push({
            type: otherType,
            name: otherDiscount.name,
            idNumber: otherDiscount.idNumber || otherDiscount.id_number,
            address: otherDiscount.address,
            tin: otherDiscount.tin
          });
        }
      }
    }
    
    // If no beneficiaries found but there's a discount, use the main discount info
    if (allBeneficiaries.length === 0 && totalDiscount > 0 && isVatExempt) {
      const discountDetails = (transaction as any).discount_details || (transaction as any).discountDetails;
      allBeneficiaries.push({
        type: discountType,
        name: discountDetails?.name || discountDetails?.beneficiaryName || customer?.name,
        idNumber: transaction.discountIdNumber || discountDetails?.idNumber,
        address: discountDetails?.address || customer?.address,
        tin: discountDetails?.tin || customer?.tin
      });
    }
    
    // Print each beneficiary with their info and signature line
    if (allBeneficiaries.length > 0) {
      receipt += formatter.horizontalLine(width);
      
      allBeneficiaries.forEach((beneficiary, index) => {
        // Determine ID type and discount label based on type
        let idType = 'ID No.';
        let discountLabel = 'DISCOUNT';
        switch (beneficiary.type) {
          case 'senior': 
            idType = 'OSCA ID No.'; 
            discountLabel = 'SENIOR CITIZEN DISCOUNT';
            break;
          case 'pwd': 
            idType = 'PWD ID No.'; 
            discountLabel = 'PWD DISCOUNT';
            break;
          case 'naac': 
          case 'athletes_coaches': 
            idType = 'NAAC ID No.'; 
            discountLabel = 'NAAC DISCOUNT';
            break;
          case 'solo_parent': 
            idType = 'Solo Parent ID No.'; 
            discountLabel = 'SOLO PARENT DISCOUNT';
            break;
        }
        
        // Discount type header
        receipt += formatter.center();
        receipt += formatter.bold(discountLabel) + '\n';
        receipt += formatter.left();
        
        // Beneficiary info
        receipt += formatter.formatLine('Name:', beneficiary.name || '___________________', width);
        receipt += formatter.formatLine(idType, beneficiary.idNumber || '___________________', width);
        if (beneficiary.address) {
          receipt += formatter.formatLine('Address:', beneficiary.address, width);
        }
        if (beneficiary.tin) {
          receipt += formatter.formatLine('TIN:', beneficiary.tin, width);
        }
        
        // Signature line for each beneficiary
        receipt += formatter.formatSignatureLine(width);
        
        // Add separator between multiple beneficiaries
        if (index < allBeneficiaries.length - 1) {
          receipt += '\n';
        }
      });
    }
    
    // Footer
    receipt += formatter.horizontalLine(width);
    receipt += formatter.center();
    
    // BIR: Compliance Footer
    receipt += formatter.bold('THIS SERVES AS YOUR INVOICE\n');
    receipt += '\nThank you for dining with us!\n';
    receipt += formatter.left();
    
    // BIR: Software Supplier/POS Provider Footer Section
    if (store) {
      receipt += formatter.horizontalLine(width);
      
      // POS Provider Name & Address
      if (store.supplier_name) {
        receipt += `POS Provider: ${store.supplier_name}\n`;
      }
      if (store.supplier_address) {
        receipt += `${store.supplier_address}\n`;
      }
      
      // Supplier VAT REG TIN
      if (store.supplier_tin) {
        receipt += `VAT REG TIN: ${this.formatTIN(store.supplier_tin)}\n`;
      }
      
      // Supplier Accreditation Info
      if (store.accreditation_number) {
        receipt += `Accreditation No: ${store.accreditation_number}\n`;
      }
      if (store.supplier_accreditation_date) {
        receipt += `Date Issued: ${new Date(store.supplier_accreditation_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}\n`;
      }
      if (store.supplier_accreditation_valid_until) {
        receipt += `Valid Until: ${new Date(store.supplier_accreditation_valid_until).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}\n`;
      }
      
      // PTU Info
      const ptuNumber = store.permit_number || 'XXXXXXX';
      const ptuDateIssued = store.date_issued 
        ? new Date(store.date_issued).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
        : 'XXXXXXX';
      const ptuValidUntil = store.valid_until
        ? new Date(store.valid_until).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
        : 'XXXXXXX';
      
      receipt += `PTU No: ${ptuNumber}\n`;
      receipt += `Date Issued: ${ptuDateIssued}\n`;
      receipt += `Valid Until: ${ptuValidUntil}\n`;
    } else {
      // Fallback PTU Info placeholder
      receipt += formatter.formatPTUInfo('XXXXXXX', 'XXXXXXX', width);
    }
    
    receipt += formatter.left();
    receipt += formatter.lineFeed(3);
    receipt += formatter.cut();
    
    return receipt;
  }

  private static formatDotMatrixReceipt(
    transaction: Transaction,
    customer?: Customer | null,
    store?: Store,
    cashierName?: string,
    isReprint?: boolean
  ): string {
    const formatter = DotMatrixFormatter;
    const width = 80;
    
    let receipt = formatter.init();
    
    // BIR Requirement: REPRINT watermark with date/time
    if (isReprint) {
      receipt += formatter.center();
      receipt += formatter.expandedFont();
      receipt += formatter.bold('*** REPRINT ***') + '\n';
      receipt += formatter.normalFont();
      receipt += `Reprinted: ${new Date().toLocaleString()}\n`;
      receipt += formatter.horizontalLine(width);
      receipt += formatter.left();
    }
    
    // Header
    if (store) {
      receipt += formatter.formatHeader(store.business_name || store.name || 'Store', store.address || '', width);
      if (store.phone) {
        receipt += formatter.formatLine('Phone:', store.phone, width);
      }
      
      // BIR: VAT Registration Status
      if (store.is_vat_registered) {
        receipt += formatter.formatLine('VAT REG. TIN:', this.formatTIN(store.tin), width);
      } else if (store.tin) {
        receipt += formatter.formatLine('NON-VAT REG. TIN:', this.formatTIN(store.tin), width);
      }
      
      // BIR: Taxpayer Name (if different)
      if (store.owner_name && store.owner_name !== store.business_name) {
        receipt += formatter.formatLine('Taxpayer:', store.owner_name, width);
      }
      
      // BIR: Permit Number and Validity
      if (store.permit_number) {
        receipt += formatter.formatLine('Permit No:', store.permit_number, width);
      }
      if (store.valid_until) {
        receipt += formatter.formatLine('Valid Until:', new Date(store.valid_until).toLocaleDateString(), width);
      }
      
      receipt += formatter.horizontalLine(width);
      
      // BIR: Supplier Information
      if (store.supplier_name) {
        receipt += formatter.formatLine('POS Provider:', store.supplier_name, width);
        if (store.supplier_address) {
          receipt += formatter.formatLine('', store.supplier_address, width);
        }
        if (store.supplier_tin) {
          receipt += formatter.formatLine('TIN:', this.formatTIN(store.supplier_tin), width);
        }
        if (store.accreditation_date) {
          receipt += formatter.formatLine('Accredited:', new Date(store.accreditation_date).toLocaleDateString(), width);
        }
        receipt += formatter.horizontalLine(width);
      }
    }
    
    // Receipt info
    receipt += formatter.formatReceiptHeader(
      transaction.receiptNumber || 'N/A',
      cashierName || 'Unknown',
      width
    );
    
    // Customer info
    if (customer) {
      receipt += formatter.formatLine('Customer:', customer.name || 'N/A', width);
      if (customer.phone) {
        receipt += formatter.formatLine('Phone:', customer.phone, width);
      }
      receipt += formatter.horizontalLine(width);
    }
    
    // Items
    receipt += formatter.formatColumnHeaders(width);
    transaction.items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      receipt += formatter.formatItemLine(
        item.name,
        formatter.formatCurrencyWithSymbol(item.unitPrice),
        item.quantity,
        formatter.formatCurrencyWithSymbol(itemTotal),
        width
      );
    });
    
    // Calculate subtotal with fallbacks (same pattern as thermal)
    let subtotalAmount = transaction.subtotal;
    if (!subtotalAmount || subtotalAmount <= 0) {
      subtotalAmount = transaction.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
    }
    if (!subtotalAmount || subtotalAmount <= 0) {
      const totalDiscount = transaction.discount || 0;
      subtotalAmount = (transaction.total || 0) + totalDiscount;
    }
    
    // Totals
    receipt += formatter.formatTotals(
      subtotalAmount,
      transaction.tax,
      transaction.total,
      width
    );
    
    // Payment
    receipt += formatter.formatPayment(
      transaction.paymentMethod,
      transaction.amountTendered || transaction.total,
      transaction.change && transaction.change > 0 ? transaction.change : undefined,
      width
    );
    
    // Footer with BIR Compliance
    receipt += formatter.horizontalLine(width);
    
    // BIR: Compliance Footer - Invoice statement
    receipt += formatter.center();
    receipt += formatter.bold('THIS SERVES AS YOUR INVOICE') + '\n';
    receipt += formatter.left();
    
    // BIR: NON-VAT Disclaimer
    if (!store?.is_vat_registered && store?.non_vat_disclaimer) {
      receipt += formatter.horizontalLine(width);
      receipt += store.non_vat_disclaimer + '\n';
    }
    
    // BIR: Software Supplier/POS Provider Footer Section
    if (store) {
      receipt += formatter.horizontalLine(width);
      
      // POS Provider Name & Address
      if (store.supplier_name) {
        receipt += formatter.formatLine('POS Provider:', store.supplier_name, width);
      }
      if (store.supplier_address) {
        receipt += store.supplier_address + '\n';
      }
      
      // Supplier VAT REG TIN
      if (store.supplier_tin) {
        receipt += formatter.formatLine('VAT REG TIN:', this.formatTIN(store.supplier_tin), width);
      }
      
      // Supplier Accreditation Info
      if (store.accreditation_number) {
        receipt += formatter.formatLine('Accreditation No:', store.accreditation_number, width);
      }
      if (store.supplier_accreditation_date) {
        receipt += formatter.formatLine('Date Issued:', new Date(store.supplier_accreditation_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }), width);
      }
      if (store.supplier_accreditation_valid_until) {
        receipt += formatter.formatLine('Valid Until:', new Date(store.supplier_accreditation_valid_until).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }), width);
      }
      
      // PTU Info
      const ptuNumber = store.permit_number || 'XXXXXXX';
      const ptuDateIssued = store.date_issued 
        ? new Date(store.date_issued).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
        : 'XXXXXXX';
      const ptuValidUntil = store.valid_until
        ? new Date(store.valid_until).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
        : 'XXXXXXX';
      
      receipt += formatter.formatLine('PTU No:', ptuNumber, width);
      receipt += formatter.formatLine('Date Issued:', ptuDateIssued, width);
      receipt += formatter.formatLine('Valid Until:', ptuValidUntil, width);
    }
    
    receipt += formatter.formatFooter(width);
    
    return receipt;
  }

  private static formatThermalTestReceipt(): string {
    const formatter = ESCPOSFormatter;
    const width = 32;
    
    let receipt = formatter.init();
    receipt += formatter.center();
    receipt += formatter.bold('THERMAL PRINTER TEST') + '\n';
    receipt += formatter.left();
    receipt += formatter.horizontalLine(width);
    receipt += formatter.formatLine('Date:', new Date().toLocaleDateString(), width);
    receipt += formatter.formatLine('Time:', new Date().toLocaleTimeString(), width);
    receipt += formatter.horizontalLine(width);
    receipt += formatter.bold('Test Item 1') + '\n';
    receipt += formatter.formatLine('P100.00 x 2', 'P200.00', width);
    receipt += formatter.bold('Test Item 2') + '\n';
    receipt += formatter.formatLine('P50.00 x 1', 'P50.00', width);
    receipt += formatter.horizontalLine(width);
    receipt += formatter.formatLine('Total:', 'P250.00', width);
    receipt += formatter.horizontalLine(width);
    receipt += formatter.center();
    receipt += 'Thermal printer test successful!\n';
    receipt += 'Features: Cutting, QR codes, Cash drawer\n';
    receipt += formatter.left();
    receipt += formatter.lineFeed(3);
    receipt += formatter.cut();
    
    return receipt;
  }

  private static formatDotMatrixTestReceipt(): string {
    return DotMatrixFormatter.testPattern(80);
  }

  // Format thermal Z-Reading report
  private static formatThermalZReading(zReadingData: any, isReprint?: boolean): string {
    const formatter = ESCPOSFormatter;
    const width = 32;
    
    let report = formatter.init();
    
    // BIR Requirement: REPRINT watermark with date/time for reprinted Z-Readings
    if (isReprint) {
      report += formatter.center();
      report += formatter.doubleSize();
      report += formatter.bold('*** REPRINT ***') + '\n';
      report += formatter.normalSize();
      report += `Reprinted: ${new Date().toLocaleString()}\n`;
      report += formatter.horizontalLine(width);
      report += formatter.left();
    }
    
    // Header
    report += formatter.center();
    report += formatter.bold(zReadingData.businessName || 'Store') + '\n';
    if (zReadingData.businessAddress) {
      report += zReadingData.businessAddress + '\n';
    }
    report += `TIN: ${zReadingData.tin || 'N/A'}\n`;
    report += `Taxpayer: ${zReadingData.taxpayerName || 'N/A'}\n`;
    report += formatter.horizontalLine(width);
    
    // Machine Info
    report += formatter.left();
    report += `MIN: ${zReadingData.machineId || 'N/A'}\n`;
    report += `S/N: ${zReadingData.serialNumber || 'N/A'}\n`;
    report += `POS Ver: ${zReadingData.posVersion || 'N/A'}\n`;
    if (zReadingData.permitNumber) {
      report += `Permit#: ${zReadingData.permitNumber}\n`;
    }
    report += formatter.horizontalLine(width);
    
    // Reading Info
    report += formatter.center();
    report += formatter.bold('Z-READING') + '\n';
    report += `#${zReadingData.readingNumber?.toString().padStart(4, '0') || '0000'}\n`;
    report += `${new Date(zReadingData.readingDate).toLocaleString()}\n`;
    report += `TERMINAL: ${zReadingData.terminalId || 'N/A'}\n`;
    report += `CASHIER: ${zReadingData.cashierName || 'N/A'}\n`;
    report += `MANAGER: ${zReadingData.managerName || 'N/A'}\n`;
    report += formatter.horizontalLine(width);
    
    // Reset Counter
    report += formatter.left();
    report += formatter.bold(`RESET COUNTER: ${zReadingData.resetCounter || 0}`) + '\n';
    report += formatter.lineFeed(1);
    
    // Transaction Range
    report += `BEG SI#: ${zReadingData.beginningReceiptNumber || 'N/A'}\n`;
    report += `END SI#: ${zReadingData.endingReceiptNumber || 'N/A'}\n`;
    report += `TRANS COUNT: ${zReadingData.transactionCount || 0}\n`;
    report += formatter.lineFeed(1);
    
    // Accumulated Grand Total
    report += formatter.bold('ACCUMULATED GRAND TOTAL') + '\n';
    report += formatter.formatLine('GROSS SALES:', formatter.formatCurrencyWithSymbol(zReadingData.accumulatedGrossSales || 0), width);
    report += formatter.formatLine('NET SALES:', formatter.formatCurrencyWithSymbol(zReadingData.accumulatedNetSales || 0), width);
    report += formatter.formatLine('VAT:', formatter.formatCurrencyWithSymbol(zReadingData.accumulatedVat || 0), width);
    report += formatter.horizontalLine(width);
    
    // Current Day Sales
    report += formatter.bold('BREAKDOWN OF SALES') + '\n';
    
    // Gross Sales
    report += formatter.bold('GROSS SALES:') + '\n';
    report += formatter.formatLine('  VATable Sales:', formatter.formatCurrencyWithSymbol(zReadingData.vatSales || 0), width);
    report += formatter.formatLine('  VAT Amount:', formatter.formatCurrencyWithSymbol(zReadingData.vatAmount || 0), width);
    report += formatter.formatLine('  VAT Exempt:', formatter.formatCurrencyWithSymbol(zReadingData.vatExemptSales || 0), width);
    report += formatter.formatLine('  Zero Rated:', formatter.formatCurrencyWithSymbol(zReadingData.zeroRatedSales || 0), width);
    report += formatter.formatLine(formatter.bold('GROSS SALES:'), formatter.bold(formatter.formatCurrencyWithSymbol(zReadingData.grossSales || 0)), width);
    report += formatter.lineFeed(1);
    
    // Discounts
    report += formatter.bold('DISCOUNTS:') + '\n';
    report += formatter.formatLine('  SC Discount:', formatter.formatCurrencyWithSymbol(zReadingData.scDiscount || 0), width);
    report += formatter.formatLine('  PWD Discount:', formatter.formatCurrencyWithSymbol(zReadingData.pwdDiscount || 0), width);
    report += formatter.formatLine('  NAAC Discount:', formatter.formatCurrencyWithSymbol(zReadingData.naacDiscount || 0), width);
    report += formatter.formatLine('  SP Discount:', formatter.formatCurrencyWithSymbol(zReadingData.spDiscount || 0), width);
    report += formatter.formatLine('  Other Discount:', formatter.formatCurrencyWithSymbol(zReadingData.otherDiscounts || 0), width);
    report += formatter.formatLine(formatter.bold('TOTAL DISCOUNT:'), formatter.bold(formatter.formatCurrencyWithSymbol(zReadingData.totalDiscounts || 0)), width);
    report += formatter.lineFeed(1);
    
    // Net Sales
    report += formatter.formatLine(formatter.bold('NET SALES:'), formatter.bold(formatter.formatCurrencyWithSymbol(zReadingData.netSales || 0)), width);
    report += formatter.horizontalLine(width);
    
    // Order Type Breakdown
    console.log('🖨️ Formatting Order Type Breakdown:', zReadingData.orderTypeBreakdown);
    if (zReadingData.orderTypeBreakdown) {
      report += formatter.bold('ORDER TYPE BREAKDOWN') + '\n';
      report += formatter.formatLine('  Dine In:', formatter.formatCurrencyWithSymbol(zReadingData.orderTypeBreakdown.dineIn || 0), width);
      report += formatter.formatLine('  Grab Food:', formatter.formatCurrencyWithSymbol(zReadingData.orderTypeBreakdown.grabFood || 0), width);
      report += formatter.formatLine('  Food Panda:', formatter.formatCurrencyWithSymbol(zReadingData.orderTypeBreakdown.foodPanda || 0), width);
      report += formatter.horizontalLine(width);
    } else {
      console.warn('⚠️ No orderTypeBreakdown data found');
    }
    
    // Payment Method Breakdown
    console.log('🖨️ Formatting Payment Method Breakdown:', zReadingData.paymentMethodBreakdown);
    if (zReadingData.paymentMethodBreakdown) {
      report += formatter.bold('PAYMENT METHOD BREAKDOWN') + '\n';
      report += formatter.formatLine('  Cash:', formatter.formatCurrencyWithSymbol(zReadingData.paymentMethodBreakdown.cash || 0), width);
      report += formatter.formatLine('  Card:', formatter.formatCurrencyWithSymbol(zReadingData.paymentMethodBreakdown.card || 0), width);
      report += formatter.formatLine('  E-Wallet:', formatter.formatCurrencyWithSymbol(zReadingData.paymentMethodBreakdown.ewallet || 0), width);
      report += formatter.horizontalLine(width);
    } else {
      console.warn('⚠️ No paymentMethodBreakdown data found');
    }
    
    // Cash Count
    report += formatter.bold('CASH COUNT') + '\n';
    report += formatter.formatLine('BEG CASH:', formatter.formatCurrencyWithSymbol(zReadingData.beginningCash || 0), width);
    report += formatter.formatLine('CASH SALES:', formatter.formatCurrencyWithSymbol(zReadingData.cashSales || 0), width);
    report += formatter.formatLine('CASH PAYOUTS:', formatter.formatCurrencyWithSymbol(zReadingData.cashPayouts || 0), width);
    report += formatter.formatLine('REFUNDS:', formatter.formatCurrencyWithSymbol(zReadingData.totalRefunds || 0), width);
    report += formatter.formatLine('EXPECTED CASH:', formatter.formatCurrencyWithSymbol(zReadingData.expectedCash || 0), width);
    report += formatter.formatLine(formatter.bold('ACTUAL CASH:'), formatter.bold(formatter.formatCurrencyWithSymbol(zReadingData.actualCash || 0)), width);
    report += formatter.formatLine(formatter.bold('CASH VARIANCE:'), 
      formatter.bold(formatter.formatCurrencyWithSymbol(zReadingData.cashVariance || 0)), width);
    report += formatter.horizontalLine(width);
    
    // Footer
    report += formatter.center();
    report += 'THIS SERVES AS YOUR\n';
    report += 'SALES INVOICE\n';
    report += formatter.lineFeed(1);
    report += `BIR Permit No. ${zReadingData.permitNumber || 'N/A'}\n`;
    report += 'Date Issued: N/A\n';
    report += 'Valid Until: N/A\n';
    report += formatter.lineFeed(1);
    report += formatter.lineFeed(2);
    report += formatter.center();
    report += '*** END OF REPORT ***\n';
    report += formatter.lineFeed(3);
    report += formatter.cut();
    
    return report;
  }

  // Format thermal X-Reading report
  private static formatThermalXReading(xReadingData: any, isReprint?: boolean): string {
    const formatter = ESCPOSFormatter;
    const width = 32;
    
    let report = formatter.init();
    
    // BIR Requirement: REPRINT watermark with date/time for reprinted X-Readings
    if (isReprint) {
      report += formatter.center();
      report += formatter.doubleSize();
      report += formatter.bold('*** REPRINT ***') + '\n';
      report += formatter.normalSize();
      report += `Reprinted: ${new Date().toLocaleString()}\n`;
      report += formatter.horizontalLine(width);
      report += formatter.left();
    }
    
    // Header
    report += formatter.center();
    report += formatter.bold(xReadingData.businessName || 'Store') + '\n';
    if (xReadingData.businessAddress) {
      report += xReadingData.businessAddress + '\n';
    }
    report += `TIN: ${xReadingData.tin || 'N/A'}\n`;
    report += `Taxpayer: ${xReadingData.taxpayerName || 'N/A'}\n`;
    report += formatter.horizontalLine(width);
    
    // Machine Info
    report += formatter.left();
    report += `MIN: ${xReadingData.machineId || 'N/A'}\n`;
    report += `S/N: ${xReadingData.serialNumber || 'N/A'}\n`;
    report += `POS Ver: ${xReadingData.posVersion || 'N/A'}\n`;
    if (xReadingData.permitNumber) {
      report += `Permit#: ${xReadingData.permitNumber}\n`;
    }
    report += formatter.horizontalLine(width);
    
    // Reading Info
    report += formatter.center();
    report += formatter.bold('X-READING') + '\n';
    report += `#${xReadingData.readingNumber?.toString().padStart(4, '0') || '0000'}\n`;
    report += `${new Date(xReadingData.readingDate).toLocaleString()}\n`;
    report += `TERMINAL: ${xReadingData.terminalId || 'N/A'}\n`;
    report += `CASHIER: ${xReadingData.cashierName || 'N/A'}\n`;
    report += formatter.horizontalLine(width);
    
    // Reset Counter
    report += formatter.left();
    report += formatter.bold(`RESET COUNTER: ${xReadingData.resetCounter || 0}`) + '\n';
    report += formatter.lineFeed(1);
    
    // Transaction Range
    report += `BEG SI#: ${xReadingData.beginningReceiptNumber || 'N/A'}\n`;
    report += `END SI#: ${xReadingData.endingReceiptNumber || 'N/A'}\n`;
    report += `TRANS COUNT: ${xReadingData.transactionCount || 0}\n`;
    report += formatter.lineFeed(1);
    
    // Accumulated Grand Total
    report += formatter.bold('ACCUMULATED GRAND TOTAL') + '\n';
    report += formatter.formatLine('GROSS SALES:', formatter.formatCurrencyWithSymbol(xReadingData.accumulatedGrossSales || 0), width);
    report += formatter.formatLine('NET SALES:', formatter.formatCurrencyWithSymbol(xReadingData.accumulatedNetSales || 0), width);
    report += formatter.formatLine('VAT:', formatter.formatCurrencyWithSymbol(xReadingData.accumulatedVat || 0), width);
    report += formatter.horizontalLine(width);
    
    // Current Shift Sales
    report += formatter.bold('BREAKDOWN OF SALES') + '\n';
    
    // Gross Sales
    report += formatter.bold('GROSS SALES:') + '\n';
    report += formatter.formatLine('  VATable Sales:', formatter.formatCurrencyWithSymbol(xReadingData.vatSales || 0), width);
    report += formatter.formatLine('  VAT Amount:', formatter.formatCurrencyWithSymbol(xReadingData.vatAmount || 0), width);
    report += formatter.formatLine('  VAT Exempt:', formatter.formatCurrencyWithSymbol(xReadingData.vatExemptSales || 0), width);
    report += formatter.formatLine('  Zero Rated:', formatter.formatCurrencyWithSymbol(xReadingData.zeroRatedSales || 0), width);
    report += formatter.formatLine(formatter.bold('GROSS SALES:'), formatter.bold(formatter.formatCurrencyWithSymbol(xReadingData.grossSales || 0)), width);
    report += formatter.lineFeed(1);
    
    // Discounts
    report += formatter.bold('DISCOUNTS:') + '\n';
    report += formatter.formatLine('  SC Discount:', formatter.formatCurrencyWithSymbol(xReadingData.scDiscount || 0), width);
    report += formatter.formatLine('  PWD Discount:', formatter.formatCurrencyWithSymbol(xReadingData.pwdDiscount || 0), width);
    report += formatter.formatLine('  NAAC Discount:', formatter.formatCurrencyWithSymbol(xReadingData.naacDiscount || 0), width);
    report += formatter.formatLine('  SP Discount:', formatter.formatCurrencyWithSymbol(xReadingData.spDiscount || 0), width);
    report += formatter.formatLine('  Other Discount:', formatter.formatCurrencyWithSymbol(xReadingData.otherDiscounts || 0), width);
    report += formatter.formatLine(formatter.bold('TOTAL DISCOUNT:'), formatter.bold(formatter.formatCurrencyWithSymbol(xReadingData.totalDiscounts || 0)), width);
    report += formatter.lineFeed(1);
    
    // Net Sales
    report += formatter.formatLine(formatter.bold('NET SALES:'), formatter.bold(formatter.formatCurrencyWithSymbol(xReadingData.netSales || 0)), width);
    report += formatter.horizontalLine(width);
    
    // Footer
    report += formatter.center();
    report += 'THIS SERVES AS YOUR\n';
    report += 'SALES INVOICE\n';
    report += formatter.lineFeed(1);
    report += `BIR Permit No. ${xReadingData.permitNumber || 'N/A'}\n`;
    report += 'Date Issued: N/A\n';
    report += 'Valid Until: N/A\n';
    report += formatter.lineFeed(2);
    report += formatter.center();
    report += '*** END OF REPORT ***\n';
    report += formatter.lineFeed(3);
    report += formatter.cut();
    
    return report;
  }

  // Format dot matrix X-Reading report
  private static formatDotMatrixXReading(xReadingData: any, isReprint?: boolean): string {
    // For dot matrix, use similar format but with wider width
    const width = 80;
    let report = '';
    
    // BIR Requirement: REPRINT watermark with date/time
    if (isReprint) {
      report += '='.repeat(width) + '\n';
      report += '*** REPRINT ***\n'.padStart(width/2 + 9);
      report += `Reprinted: ${new Date().toLocaleString()}\n`;
      report += '='.repeat(width) + '\n';
    }
    
    // Simple text-based format for dot matrix printers
    report += '='.repeat(width) + '\n';
    report += `${(xReadingData.businessName || 'Store').padStart(width/2 + (xReadingData.businessName?.length || 5)/2)}\n`;
    report += `${(xReadingData.businessAddress || '').padStart(width/2 + (xReadingData.businessAddress?.length || 0)/2)}\n`;
    report += `TIN: ${xReadingData.tin || 'N/A'}\n`;
    report += '='.repeat(width) + '\n';
    report += 'X-READING REPORT\n';
    report += `Reading Number: ${xReadingData.readingNumber || 0}\n`;
    report += `Date: ${new Date(xReadingData.readingDate).toLocaleString()}\n`;
    report += `Terminal: ${xReadingData.terminalId || 'N/A'}\n`;
    report += `Cashier: ${xReadingData.cashierName || 'N/A'}\n`;
    report += '-'.repeat(width) + '\n';
    
    // Add key financial data
    report += `Gross Sales: ₱${(xReadingData.grossSales || 0).toFixed(2)}\n`;
    report += `Net Sales: ₱${(xReadingData.netSales || 0).toFixed(2)}\n`;
    report += `Total Discounts: ₱${(xReadingData.totalDiscounts || 0).toFixed(2)}\n`;
    report += '='.repeat(width) + '\n';
    report += '*** END OF REPORT ***\n';
    report += '\n\n\n'; // Extra line feeds for tear-off
    
    return report;
  }

  // Format dot matrix Z-Reading report
  private static formatDotMatrixZReading(zReadingData: any, isReprint?: boolean): string {
    // For dot matrix, use similar format but with wider width
    const width = 80;
    let report = '';
    
    // BIR Requirement: REPRINT watermark with date/time
    if (isReprint) {
      report += '='.repeat(width) + '\n';
      report += '*** REPRINT ***\n'.padStart(width/2 + 9);
      report += `Reprinted: ${new Date().toLocaleString()}\n`;
      report += '='.repeat(width) + '\n';
    }
    
    // Simple text-based format for dot matrix printers
    report += '='.repeat(width) + '\n';
    report += `${(zReadingData.businessName || 'Store').padStart(width/2 + (zReadingData.businessName?.length || 5)/2)}\n`;
    report += `${(zReadingData.businessAddress || '').padStart(width/2 + (zReadingData.businessAddress?.length || 0)/2)}\n`;
    report += `TIN: ${zReadingData.tin || 'N/A'}\n`;
    report += '='.repeat(width) + '\n';
    report += 'Z-READING REPORT\n';
    report += `Reading Number: ${zReadingData.readingNumber || 0}\n`;
    report += `Date: ${new Date(zReadingData.readingDate).toLocaleString()}\n`;
    report += `Terminal: ${zReadingData.terminalId || 'N/A'}\n`;
    report += `Cashier: ${zReadingData.cashierName || 'N/A'}\n`;
    report += `Manager: ${zReadingData.managerName || 'N/A'}\n`;
    report += '-'.repeat(width) + '\n';
    
    // Add key financial data
    report += `Gross Sales: ₱${(zReadingData.grossSales || 0).toFixed(2)}\n`;
    report += `Net Sales: ₱${(zReadingData.netSales || 0).toFixed(2)}\n`;
    report += `Total Discounts: ₱${(zReadingData.totalDiscounts || 0).toFixed(2)}\n`;
    report += `Cash Variance: ₱${(zReadingData.cashVariance || 0).toFixed(2)}\n`;
    report += '='.repeat(width) + '\n';
    report += '*** END OF REPORT ***\n';
    report += '\n\n\n'; // Extra line feeds for tear-off
    
    return report;
  }

  // Check if printer supports specific features
  static supportsCutting(printer: BluetoothPrinter): boolean {
    return printer.capabilities?.supportsCutting ?? 
           (printer.printerType === 'thermal');
  }

  static supportsQRCodes(printer: BluetoothPrinter): boolean {
    return printer.capabilities?.supportsQRCodes ?? 
           (printer.printerType === 'thermal');
  }

  static supportsCashDrawer(printer: BluetoothPrinter): boolean {
    return printer.capabilities?.supportsCashDrawer ?? 
           (printer.printerType === 'thermal');
  }

  static getMaxLineWidth(printer: BluetoothPrinter): number {
    return printer.capabilities?.maxLineWidth ?? 
           (printer.printerType === 'dot-matrix' ? 80 : 32);
  }
}