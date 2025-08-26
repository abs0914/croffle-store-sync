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