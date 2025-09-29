import { BluetoothPrinter, PrinterType, PrinterCapabilities, DEFAULT_THERMAL_CAPABILITIES, DEFAULT_DOT_MATRIX_CAPABILITIES } from '@/types/printer';
import { ESCPOSFormatter } from './ESCPOSFormatter';
import { DotMatrixFormatter } from './DotMatrixFormatter';
import { Transaction, Customer } from '@/types';
import { Store } from '@/types/store';

export class PrinterTypeManager {
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
      receipt += formatter.bold(store.name || 'Store') + '\n';
      if (store.address) {
        receipt += store.address + '\n';
      }
      if (store.phone) {
        receipt += store.phone + '\n';
      }
      receipt += formatter.horizontalLine(width);
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
    receipt += 'Thank you for your business!\n';
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
      receipt += formatter.formatHeader(store.name || 'Store', store.address || '', width);
      if (store.phone) {
        receipt += formatter.formatLine('Phone:', store.phone, width);
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
    
    // Footer
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
    report += 'POS PROVIDER:\n';
    report += 'Croffle Bro System\n';
    report += 'TIN: 123-456-789-000\n';
    report += 'Addr: Philippines\n';
    report += 'Date Issued: N/A\n';
    report += 'PTU No. N/A Valid Until: N/A\n';
    report += formatter.lineFeed(2);
    report += formatter.center();
    report += '*** END OF REPORT ***\n';
    report += formatter.lineFeed(3);
    report += formatter.cut();
    
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