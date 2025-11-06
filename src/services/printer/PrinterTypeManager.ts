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
    cashierName?: string
  ): string {
    const printerType = printer.printerType || 'thermal';
    
    if (printerType === 'dot-matrix') {
      return this.formatDotMatrixReceipt(transaction, customer, store, cashierName);
    } else {
      return this.formatThermalReceipt(transaction, customer, store, cashierName);
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
  static formatZReading(printer: BluetoothPrinter, zReadingData: any): string {
    const printerType = printer.printerType || 'thermal';
    
    if (printerType === 'dot-matrix') {
      return this.formatDotMatrixZReading(zReadingData);
    } else {
      return this.formatThermalZReading(zReadingData);
    }
  }

  // Format X-Reading based on printer type
  static formatXReading(printer: BluetoothPrinter, xReadingData: any): string {
    const printerType = printer.printerType || 'thermal';
    
    if (printerType === 'dot-matrix') {
      return this.formatDotMatrixXReading(xReadingData);
    } else {
      return this.formatThermalXReading(xReadingData);
    }
  }

  // Private methods for specific printer formatting
  private static formatThermalReceipt(
    transaction: Transaction,
    customer?: Customer | null,
    store?: Store,
    cashierName?: string
  ): string {
    // Use existing thermal formatting logic
    const formatter = ESCPOSFormatter;
    const width = 32;
    
    let receipt = formatter.init();
    
    // Header
    if (store) {
      receipt += formatter.center();
      receipt += formatter.bold(store.business_name || store.name || 'Store') + '\n';
      if (store.address) {
        receipt += store.address + '\n';
      }
      if (store.phone) {
        receipt += store.phone + '\n';
      }
      
      // BIR: VAT Registration Status
      if (store.is_vat_registered) {
        receipt += `VAT REG. TIN: ${this.formatTIN(store.tin)}\n`;
      } else if (store.tin) {
        receipt += `NON-VAT REG. TIN: ${this.formatTIN(store.tin)}\n`;
      }
      
      // BIR: Taxpayer Name (if different)
      if (store.owner_name && store.owner_name !== store.business_name) {
        receipt += `Taxpayer: ${store.owner_name}\n`;
      }
      
      // BIR: Permit Number and Validity
      if (store.permit_number) {
        receipt += `Permit No: ${store.permit_number}\n`;
      }
      if (store.valid_until) {
        receipt += `Valid Until: ${new Date(store.valid_until).toLocaleDateString()}\n`;
      }
      
      receipt += formatter.horizontalLine(width);
      
      // BIR: Supplier Information
      if (store.supplier_name) {
        receipt += `POS Provider:\n`;
        receipt += `${store.supplier_name}\n`;
        if (store.supplier_address) {
          receipt += `${store.supplier_address}\n`;
        }
        if (store.supplier_tin) {
          receipt += `TIN: ${this.formatTIN(store.supplier_tin)}\n`;
        }
        if (store.accreditation_date) {
          receipt += `Accredited: ${new Date(store.accreditation_date).toLocaleDateString()}\n`;
        }
        receipt += formatter.horizontalLine(width);
      }
      
      receipt += formatter.left();
    }
    
    // Receipt info
    receipt += formatter.formatLine('Receipt #:', transaction.receiptNumber || 'N/A', width);
    receipt += formatter.formatLine('Cashier:', cashierName || 'Unknown', width);
    receipt += formatter.formatLine('Date:', new Date(transaction.createdAt).toLocaleDateString(), width);
    receipt += formatter.formatLine('Time:', new Date(transaction.createdAt).toLocaleTimeString(), width);
    receipt += formatter.horizontalLine(width);
    
    // Customer info
    if (customer) {
      receipt += formatter.formatLine('Customer:', customer.name || 'N/A', width);
      if (customer.phone) {
        receipt += formatter.formatLine('Phone:', customer.phone, width);
      }
      receipt += formatter.horizontalLine(width);
    }
    
    // Items
    receipt += formatter.bold('ITEMS:') + '\n';
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
    
    // Totals
    receipt += formatter.horizontalLine(width);
    receipt += formatter.formatLine('Subtotal:', formatter.formatCurrencyWithSymbol(transaction.subtotal), width);
    
    if (transaction.tax > 0) {
      receipt += formatter.formatLine('Tax:', formatter.formatCurrencyWithSymbol(transaction.tax), width);
    }
    
    if (transaction.discount > 0) {
      receipt += formatter.formatLine('Discount:', formatter.formatCurrencyWithSymbol(-transaction.discount), width);
    }
    
    receipt += formatter.formatLine('TOTAL:', formatter.bold(formatter.formatCurrencyWithSymbol(transaction.total)), width);
    
    // Payment
    receipt += formatter.horizontalLine(width);
    receipt += formatter.formatLine('Payment:', transaction.paymentMethod.toUpperCase(), width);
    receipt += formatter.formatLine('Amount Paid:', formatter.formatCurrencyWithSymbol(transaction.amountTendered || transaction.total), width);
    
    if (transaction.change && transaction.change > 0) {
      receipt += formatter.formatLine('Change:', formatter.formatCurrencyWithSymbol(transaction.change), width);
    }
    
    // Footer
    receipt += formatter.horizontalLine(width);
    receipt += formatter.center();
    
    // BIR: Compliance Footer
    if (store?.is_bir_accredited) {
      receipt += formatter.bold('THIS SERVES AS AN\nOFFICIAL RECEIPT\n');
    } else {
      receipt += formatter.bold('THIS IS NOT AN\nOFFICIAL RECEIPT\n');
    }
    
    // BIR: NON-VAT Disclaimer
    if (!store?.is_vat_registered && store?.non_vat_disclaimer) {
      receipt += '\n' + store.non_vat_disclaimer + '\n';
    }
    
    receipt += '\nThank you for your business!\n';
    receipt += formatter.left();
    receipt += formatter.lineFeed(3);
    receipt += formatter.cut();
    
    return receipt;
  }

  private static formatDotMatrixReceipt(
    transaction: Transaction,
    customer?: Customer | null,
    store?: Store,
    cashierName?: string
  ): string {
    const formatter = DotMatrixFormatter;
    const width = 80;
    
    let receipt = formatter.init();
    
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
    
    // Totals
    receipt += formatter.formatTotals(
      transaction.subtotal,
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
    
    // BIR: Compliance Footer
    if (store?.is_bir_accredited) {
      receipt += formatter.center();
      receipt += formatter.bold('THIS SERVES AS AN OFFICIAL RECEIPT') + '\n';
      receipt += formatter.left();
    } else {
      receipt += formatter.center();
      receipt += formatter.bold('THIS IS NOT AN OFFICIAL RECEIPT') + '\n';
      receipt += formatter.left();
    }
    
    // BIR: NON-VAT Disclaimer
    if (!store?.is_vat_registered && store?.non_vat_disclaimer) {
      receipt += formatter.horizontalLine(width);
      receipt += store.non_vat_disclaimer + '\n';
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
  private static formatThermalZReading(zReadingData: any): string {
    const formatter = ESCPOSFormatter;
    const width = 32;
    
    let report = formatter.init();
    
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
  private static formatThermalXReading(xReadingData: any): string {
    const formatter = ESCPOSFormatter;
    const width = 32;
    
    let report = formatter.init();
    
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
  private static formatDotMatrixXReading(xReadingData: any): string {
    // For dot matrix, use similar format but with wider width
    const width = 80;
    let report = '';
    
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
  private static formatDotMatrixZReading(zReadingData: any): string {
    // For dot matrix, use similar format but with wider width
    const width = 80;
    let report = '';
    
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