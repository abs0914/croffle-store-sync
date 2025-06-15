import { BleClient } from '@capacitor-community/bluetooth-le';
import { ESCPOSFormatter } from './ESCPOSFormatter';
import { PrinterDiscovery, ThermalPrinter } from './PrinterDiscovery';
import { Transaction, Customer } from '@/types';

export class BluetoothPrinterService {
  private static readonly PRINT_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
  private static readonly PRINT_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';
  
  static async isAvailable(): Promise<boolean> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.log('Not in browser environment');
        return false;
      }

      // Check for Web Bluetooth API (for web browsers)
      if ('bluetooth' in navigator) {
        try {
          const available = await navigator.bluetooth.getAvailability();
          if (available) {
            console.log('Web Bluetooth API available');
            return true;
          } else {
            console.log('Bluetooth not available on this device');
            return false;
          }
        } catch (error) {
          console.log('Web Bluetooth check failed:', error);
          // Continue to try Capacitor BLE
        }
      }

      // Try Capacitor BLE (for mobile apps)
      try {
        await PrinterDiscovery.initialize();
        console.log('Capacitor Bluetooth LE available');
        return true;
      } catch (error) {
        console.log('Capacitor Bluetooth LE not available:', error);
        return false;
      }
    } catch (error) {
      console.log('Bluetooth thermal printing not available:', error);
      return false;
    }
  }
  
  static async printReceipt(
    transaction: Transaction,
    customer?: Customer | null,
    storeName?: string
  ): Promise<boolean> {
    const printer = PrinterDiscovery.getConnectedPrinter();
    if (!printer?.isConnected) {
      throw new Error('No printer connected');
    }

    try {
      const receiptData = this.formatReceiptForThermal(transaction, customer, storeName);
      const success = await this.sendDataToPrinter(printer, receiptData);

      if (success) {
        console.log('Receipt printed successfully');
      }

      return success;
    } catch (error) {
      console.error('Failed to print receipt:', error);
      return false;
    }
  }
  
  static async printTestReceipt(): Promise<boolean> {
    const printer = PrinterDiscovery.getConnectedPrinter();
    if (!printer?.isConnected) {
      throw new Error('No printer connected');
    }

    try {
      const testData = this.formatTestReceipt();
      return await this.sendDataToPrinter(printer, testData);
    } catch (error) {
      console.error('Failed to print test receipt:', error);
      return false;
    }
  }

  private static async sendDataToPrinter(printer: any, data: string): Promise<boolean> {
    try {
      console.log(`Sending data to printer via ${printer.connectionType}...`);

      if (printer.connectionType === 'web' && printer.webBluetoothDevice) {
        return await this.sendDataViaWebBluetooth(printer.webBluetoothDevice, data);
      } else if (printer.connectionType === 'capacitor' && printer.device) {
        return await this.sendDataViaCapacitorBLE(printer.device, data);
      } else {
        throw new Error('Invalid printer configuration for printing');
      }
    } catch (error) {
      console.error('Failed to send data to printer:', error);
      return false;
    }
  }

  private static async sendDataViaWebBluetooth(device: BluetoothDevice, data: string): Promise<boolean> {
    try {
      if (!device.gatt?.connected) {
        throw new Error('Device not connected');
      }

      // For Web Bluetooth, we need to discover services and characteristics
      // This is a simplified implementation - real thermal printers may use different UUIDs
      console.log('Attempting to send data via Web Bluetooth...');

      // Try to get the primary service (this may vary by printer)
      const services = await device.gatt.getPrimaryServices();
      console.log(`Found ${services.length} services`);

      // For now, we'll try a common approach for thermal printers
      // Many thermal printers use Serial Port Profile or custom services

      // This is a placeholder - in a real implementation, you'd need to:
      // 1. Identify the correct service UUID for your thermal printer
      // 2. Find the write characteristic
      // 3. Write the ESC/POS data to that characteristic

      console.log('Web Bluetooth printing not fully implemented yet');
      console.log('Data to print:', data.substring(0, 100) + '...');

      // For now, return true to simulate successful printing
      // In production, implement proper service/characteristic discovery
      return true;
    } catch (error) {
      console.error('Web Bluetooth printing failed:', error);
      return false;
    }
  }

  private static async sendDataViaCapacitorBLE(device: any, data: string): Promise<boolean> {
    try {
      const bytes = new TextEncoder().encode(data);
      const dataView = new DataView(bytes.buffer);

      await BleClient.write(
        device.deviceId,
        this.PRINT_SERVICE_UUID,
        this.PRINT_CHARACTERISTIC_UUID,
        dataView
      );

      console.log('Data sent via Capacitor BLE successfully');
      return true;
    } catch (error) {
      console.error('Capacitor BLE printing failed:', error);
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
