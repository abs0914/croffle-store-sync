import { BleClient } from '@capacitor-community/bluetooth-le';
import { ESCPOSFormatter } from './ESCPOSFormatter';
import { PrinterDiscovery, ThermalPrinter } from './PrinterDiscovery';
import { Transaction, Customer } from '@/types';

export class BluetoothPrinterService {
  // Capacitor BLE UUIDs (for mobile apps)
  private static readonly PRINT_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
  private static readonly PRINT_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

  // Web Bluetooth UUIDs (for thermal printers like POS58)
  private static readonly WEB_BLUETOOTH_SERVICE_UUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
  private static readonly WEB_BLUETOOTH_WRITE_CHARACTERISTIC_UUID = '49535343-1e4d-4bd9-ba61-23c647249616';
  
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
      console.log('🖨️ Preparing test receipt...');
      const testData = this.formatTestReceipt();
      console.log(`📄 Test receipt formatted (${testData.length} characters)`);

      return await this.sendDataToPrinter(printer, testData);
    } catch (error) {
      console.error('Failed to print test receipt:', error);
      return false;
    }
  }

  // Debug method to test service discovery without printing
  static async testServiceDiscovery(): Promise<boolean> {
    const printer = PrinterDiscovery.getConnectedPrinter();
    if (!printer?.isConnected || !printer.webBluetoothDevice) {
      throw new Error('No Web Bluetooth printer connected');
    }

    try {
      console.log('🔍 Testing service discovery...');
      const device = printer.webBluetoothDevice;

      if (!device.gatt?.connected) {
        throw new Error('Device not connected');
      }

      // Discover all services
      const services = await device.gatt.getPrimaryServices();
      console.log(`📡 Found ${services.length} services:`);

      if (services.length === 0) {
        console.error('❌ No services found! This indicates a Web Bluetooth API issue.');
        console.log('💡 Possible solutions:');
        console.log('   1. Ensure the printer is properly paired in system Bluetooth settings');
        console.log('   2. Try disconnecting and reconnecting the printer');
        console.log('   3. Check if the printer requires specific service UUIDs in optionalServices');
        return false;
      }

      for (const service of services) {
        console.log(`  Service: ${service.uuid}`);

        try {
          const characteristics = await service.getCharacteristics();
          console.log(`    Characteristics (${characteristics.length}):`);

          for (const char of characteristics) {
            const props = [];
            if (char.properties.read) props.push('read');
            if (char.properties.write) props.push('write');
            if (char.properties.writeWithoutResponse) props.push('writeWithoutResponse');
            if (char.properties.notify) props.push('notify');

            console.log(`      ${char.uuid} [${props.join(', ')}]`);
          }
        } catch (charError) {
          console.log(`    Failed to get characteristics: ${charError}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Service discovery failed:', error);
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

      console.log('Attempting to send data via Web Bluetooth...');
      console.log(`Data length: ${data.length} characters`);
      console.log('Data preview:', data.substring(0, 100) + (data.length > 100 ? '...' : ''));

      // Step 1: Get the thermal printer service
      console.log(`Looking for service: ${this.WEB_BLUETOOTH_SERVICE_UUID}`);
      let service: BluetoothRemoteGATTService;

      try {
        service = await device.gatt.getPrimaryService(this.WEB_BLUETOOTH_SERVICE_UUID);
        console.log('✅ Found thermal printer service');
      } catch (serviceError) {
        console.warn('Primary service not found, trying service discovery...');

        // Fallback: Try to discover all services and find a suitable one
        const services = await device.gatt.getPrimaryServices();
        console.log(`Found ${services.length} services total`);

        if (services.length === 0) {
          throw new Error('No Services found in device. The printer may not be properly paired or may require different service UUIDs.');
        }

        // Log all service UUIDs for debugging
        for (const svc of services) {
          console.log(`Service UUID: ${svc.uuid}`);
        }

        // Try to find a service that might be for printing (more comprehensive search)
        service = services.find(s => {
          const uuid = s.uuid.toLowerCase();
          return uuid.includes('49535343') ||
                 uuid.includes('18f0') ||
                 uuid.includes('fff0') ||
                 uuid.includes('6e40') ||  // Nordic UART
                 uuid.includes('1234');   // Generic printer
        });

        // If no specific printer service found, try the first available service
        if (!service && services.length > 0) {
          console.warn('No known printer service found, trying first available service...');
          service = services[0];
        }

        if (!service) {
          throw new Error('No suitable service found for printing');
        }

        console.log(`Using service: ${service.uuid}`);
      }

      // Step 2: Get the write characteristic
      console.log(`Looking for write characteristic: ${this.WEB_BLUETOOTH_WRITE_CHARACTERISTIC_UUID}`);
      let writeCharacteristic: BluetoothRemoteGATTCharacteristic;

      try {
        writeCharacteristic = await service.getCharacteristic(this.WEB_BLUETOOTH_WRITE_CHARACTERISTIC_UUID);
        console.log('✅ Found write characteristic');
      } catch (charError) {
        console.warn('Primary characteristic not found, trying characteristic discovery...');

        // Fallback: Try to discover all characteristics and find a writable one
        const characteristics = await service.getCharacteristics();
        console.log(`Found ${characteristics.length} characteristics`);

        // Log all characteristic UUIDs and properties for debugging
        for (const char of characteristics) {
          console.log(`Characteristic UUID: ${char.uuid}, Properties:`, char.properties);
        }

        // Find a characteristic that supports writing
        writeCharacteristic = characteristics.find(c =>
          c.properties.write || c.properties.writeWithoutResponse
        );

        if (!writeCharacteristic) {
          throw new Error('No writable characteristic found');
        }

        console.log(`Using characteristic: ${writeCharacteristic.uuid}`);
      }

      // Step 3: Convert data to bytes and send
      console.log('Converting data to bytes...');
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(data);
      console.log(`Data converted to ${dataBytes.length} bytes`);

      // Step 4: Send data to printer
      console.log('Sending data to printer...');

      if (writeCharacteristic.properties.writeWithoutResponse) {
        console.log('Using writeWithoutResponse...');
        await writeCharacteristic.writeValueWithoutResponse(dataBytes);
      } else if (writeCharacteristic.properties.write) {
        console.log('Using writeValue...');
        await writeCharacteristic.writeValue(dataBytes);
      } else {
        throw new Error('Characteristic does not support writing');
      }

      console.log('✅ Data sent to thermal printer successfully via Web Bluetooth');
      return true;

    } catch (error: any) {
      console.error('❌ Web Bluetooth printing failed:', error);

      // Provide specific error messages
      if (error.message?.includes('service')) {
        console.error('Service discovery failed. The printer may use different service UUIDs.');
      } else if (error.message?.includes('characteristic')) {
        console.error('Characteristic discovery failed. The printer may use different characteristic UUIDs.');
      } else if (error.message?.includes('write')) {
        console.error('Writing to characteristic failed. Check printer connection and data format.');
      }

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
