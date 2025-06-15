
import { BleClient } from '@capacitor-community/bluetooth-le';
import { ESCPOSFormatter } from './ESCPOSFormatter';
import { PrinterDiscovery, ThermalPrinter } from './PrinterDiscovery';
import { Transaction, Customer } from '@/types';

export class BluetoothPrinterService {
  private static readonly PRINT_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
  private static readonly PRINT_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';
  
  static async isAvailable(): Promise<boolean> {
    try {
      await PrinterDiscovery.initialize();
      return true;
    } catch {
      return false;
    }
  }
  
  static async printReceipt(
    transaction: Transaction,
    customer?: Customer | null,
    storeName?: string
  ): Promise<boolean> {
    const printer = PrinterDiscovery.getConnectedPrinter();
    if (!printer?.isConnected || !printer.device) {
      throw new Error('No printer connected');
    }
    
    try {
      const receiptData = this.formatReceiptForThermal(transaction, customer, storeName);
      const bytes = new TextEncoder().encode(receiptData);
      
      await BleClient.write(
        printer.device.deviceId,
        this.PRINT_SERVICE_UUID,
        this.PRINT_CHARACTERISTIC_UUID,
        bytes
      );
      
      console.log('Receipt printed successfully');
      return true;
    } catch (error) {
      console.error('Failed to print receipt:', error);
      return false;
    }
  }
  
  static async printTestReceipt(): Promise<boolean> {
    const printer = PrinterDiscovery.getConnectedPrinter();
    if (!printer?.isConnected || !printer.device) {
      throw new Error('No printer connected');
    }
    
    try {
      const testData = this.formatTestReceipt();
      const bytes = new TextEncoder().encode(testData);
      
      await BleClient.write(
        printer.device.deviceId,
        this.PRINT_SERVICE_UUID,
        this.PRINT_CHARACTERISTIC_UUID,
        bytes
      );
      
      return true;
    } catch (error) {
      console.error('Failed to print test receipt:', error);
      return false;
    }
  }
  
  private static formatReceiptForThermal(
    transaction: Transaction,
    customer?: Customer | null,
    storeName?: string
  ): string {
    let receipt = ESCPOSFormatter.init();
    
    // Header
    receipt += ESCPOSFormatter.center();
    receipt += ESCPOSFormatter.bold(ESCPOSFormatter.doubleWidth());
    receipt += (storeName || 'THE CROFFLE STORE') + ESCPOSFormatter.lineFeed();
    receipt += ESCPOSFormatter.normalWidth();
    receipt += ESCPOSFormatter.left();
    receipt += 'SALES RECEIPT' + ESCPOSFormatter.lineFeed(2);
    
    // Receipt details
    receipt += ESCPOSFormatter.formatLine(
      'Receipt #:', 
      transaction.receiptNumber
    );
    receipt += ESCPOSFormatter.formatLine(
      'Date:', 
      new Date(transaction.createdAt).toLocaleDateString('en-PH')
    );
    receipt += ESCPOSFormatter.formatLine(
      'Time:', 
      new Date(transaction.createdAt).toLocaleTimeString('en-PH')
    );
    
    if (customer) {
      receipt += ESCPOSFormatter.lineFeed();
      receipt += ESCPOSFormatter.formatLine('Customer:', customer.name);
      if (customer.phone) {
        receipt += ESCPOSFormatter.formatLine('Phone:', customer.phone);
      }
    }
    
    receipt += ESCPOSFormatter.horizontalLine();
    
    // Items
    transaction.items.forEach(item => {
      receipt += ESCPOSFormatter.bold(item.name) + ESCPOSFormatter.lineFeed();
      receipt += ESCPOSFormatter.formatLine(
        `  ${ESCPOSFormatter.formatCurrency(item.unitPrice, 10)} x ${item.quantity}`,
        ESCPOSFormatter.formatCurrency(item.totalPrice, 12)
      );
    });
    
    receipt += ESCPOSFormatter.horizontalLine();
    
    // Totals
    receipt += ESCPOSFormatter.formatLine(
      'Subtotal:',
      ESCPOSFormatter.formatCurrency(transaction.subtotal, 15)
    );
    
    if (transaction.discount > 0) {
      receipt += ESCPOSFormatter.formatLine(
        'Discount:',
        '-' + ESCPOSFormatter.formatCurrency(transaction.discount, 14)
      );
    }
    
    receipt += ESCPOSFormatter.formatLine(
      'VAT (12%):',
      ESCPOSFormatter.formatCurrency(transaction.tax, 15)
    );
    
    receipt += ESCPOSFormatter.horizontalLine();
    receipt += ESCPOSFormatter.bold(
      ESCPOSFormatter.formatLine(
        'TOTAL:',
        ESCPOSFormatter.formatCurrency(transaction.total, 15)
      )
    );
    
    // Payment details
    receipt += ESCPOSFormatter.lineFeed();
    receipt += ESCPOSFormatter.formatLine(
      'Payment:',
      transaction.paymentMethod.toUpperCase()
    );
    
    if (transaction.paymentMethod === 'cash') {
      receipt += ESCPOSFormatter.formatLine(
        'Tendered:',
        ESCPOSFormatter.formatCurrency(transaction.amountTendered || 0, 15)
      );
      receipt += ESCPOSFormatter.formatLine(
        'Change:',
        ESCPOSFormatter.formatCurrency(transaction.change || 0, 15)
      );
    }
    
    // Footer
    receipt += ESCPOSFormatter.lineFeed(2);
    receipt += ESCPOSFormatter.center();
    receipt += 'Thank you for your purchase!' + ESCPOSFormatter.lineFeed();
    receipt += ESCPOSFormatter.qrCode(transaction.receiptNumber);
    receipt += ESCPOSFormatter.lineFeed(3);
    receipt += ESCPOSFormatter.cut();
    
    return receipt;
  }
  
  private static formatTestReceipt(): string {
    let receipt = ESCPOSFormatter.init();
    
    receipt += ESCPOSFormatter.center();
    receipt += ESCPOSFormatter.bold(ESCPOSFormatter.doubleWidth());
    receipt += 'TEST RECEIPT' + ESCPOSFormatter.lineFeed();
    receipt += ESCPOSFormatter.normalWidth();
    receipt += ESCPOSFormatter.left();
    receipt += ESCPOSFormatter.lineFeed();
    
    receipt += 'Printer connection: OK' + ESCPOSFormatter.lineFeed();
    receipt += 'Date: ' + new Date().toLocaleDateString() + ESCPOSFormatter.lineFeed();
    receipt += 'Time: ' + new Date().toLocaleTimeString() + ESCPOSFormatter.lineFeed();
    
    receipt += ESCPOSFormatter.lineFeed(2);
    receipt += ESCPOSFormatter.center();
    receipt += 'Thermal printing ready!' + ESCPOSFormatter.lineFeed(3);
    receipt += ESCPOSFormatter.cut();
    
    return receipt;
  }
}
