import { BleClient } from '@capacitor-community/bluetooth-le';
import { ESCPOSFormatter } from './ESCPOSFormatter';
import { PrinterDiscovery, BluetoothPrinter } from './PrinterDiscovery';
import { PrinterTypeManager } from './PrinterTypeManager';
import { Transaction, Customer } from '@/types';
import { Store } from '@/types/store';
import { BIRComplianceService } from '@/services/bir/birComplianceService';

export class BluetoothPrinterService {
  // Capacitor BLE UUIDs (for mobile apps)
  private static readonly PRINT_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
  private static readonly PRINT_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

  // Web Bluetooth UUIDs (for thermal printers like POS58)
  private static readonly WEB_BLUETOOTH_SERVICE_UUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
  private static readonly WEB_BLUETOOTH_WRITE_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';
  
  static async isAvailable(): Promise<boolean> {
    try {
      console.log('🔍 Checking Bluetooth thermal printing availability...');
      
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
            console.log('✅ Web Bluetooth thermal printing available');
            return true;
          } else {
            console.log('⚠️ Bluetooth not available on this device');
          }
        } catch (error) {
          console.log('⚠️ Web Bluetooth check failed, trying Capacitor BLE...', error);
        }
      }

      // Try Capacitor BLE (for mobile apps)
      try {
        await PrinterDiscovery.initialize();
        console.log('✅ Capacitor Bluetooth LE thermal printing available');
        return true;
      } catch (error: any) {
        console.log('❌ Capacitor BLE initialization failed:', error?.message || error);
        
        // Check if it's a permission issue vs hardware issue
        if (error?.message?.includes('permission') || error?.message?.includes('location')) {
          console.log('💡 Bluetooth hardware available but needs permissions');
          return true; // Still return true as hardware is available, just needs permission
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Bluetooth thermal printing availability check failed:', error);
      return false;
    }
  }
  
  static async printReceipt(
    transaction: Transaction,
    customer?: Customer | null,
    store?: Store,
    cashierName?: string,
    autoOpenDrawer?: boolean
  ): Promise<boolean> {
    const printer = PrinterDiscovery.getConnectedPrinter();
    if (!printer?.isConnected) {
      throw new Error('No printer connected');
    }

    try {
      const receiptData = PrinterTypeManager.formatReceipt(printer, transaction, customer, store, cashierName);
      const success = await this.sendDataToPrinter(printer, receiptData);

      if (success) {
        console.log('Receipt printed successfully');
        
        // Auto-open cash drawer if enabled, it's a cash transaction, and printer supports it
        if (autoOpenDrawer && transaction.paymentMethod === 'cash' && PrinterTypeManager.supportsCashDrawer(printer)) {
          console.log('Auto-opening cash drawer for cash transaction...');
          setTimeout(async () => {
            try {
              await this.openCashDrawer();
              console.log('Cash drawer auto-opened successfully');
            } catch (drawerError) {
              console.error('Failed to auto-open cash drawer:', drawerError);
              // Don't fail the receipt printing if drawer fails
            }
          }, 500); // Small delay to ensure receipt finishes printing first
        }
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
      const testData = PrinterTypeManager.formatTestReceipt(printer);
      console.log(`📄 Test receipt formatted (${testData.length} characters)`);

      return await this.sendDataToPrinter(printer, testData);
    } catch (error) {
      console.error('Failed to print test receipt:', error);
      return false;
    }
  }

  static async openCashDrawer(drawerPin: number = 0, onTime: number = 25, offTime: number = 25): Promise<boolean> {
    const printer = PrinterDiscovery.getConnectedPrinter();
    if (!printer?.isConnected) {
      throw new Error('No printer connected');
    }

    if (!PrinterTypeManager.supportsCashDrawer(printer)) {
      throw new Error('Connected printer does not support cash drawer functionality');
    }

    try {
      console.log('💰 Opening cash drawer...');
      const drawerCommand = ESCPOSFormatter.openCashDrawer(drawerPin, onTime, offTime);
      console.log(`📨 Drawer command prepared (${drawerCommand.length} bytes)`);

      const success = await this.sendDataToPrinter(printer, drawerCommand);
      
      if (success) {
        console.log('✅ Cash drawer opened successfully');
        // Optional: Add beep for confirmation
        setTimeout(() => {
          this.sendDataToPrinter(printer, ESCPOSFormatter.beep(1));
        }, 200);
      }

      return success;
    } catch (error) {
      console.error('Failed to open cash drawer:', error);
      return false;
    }
  }

  static async testCashDrawer(): Promise<boolean> {
    const printer = PrinterDiscovery.getConnectedPrinter();
    if (!printer?.isConnected) {
      throw new Error('No printer connected');
    }

    if (!PrinterTypeManager.supportsCashDrawer(printer)) {
      throw new Error('Connected printer does not support cash drawer functionality');
    }

    try {
      console.log('🧪 Testing cash drawer connection...');
      
      // Try primary command first
      let success = await this.openCashDrawer(0, 25, 25);
      
      if (!success) {
        console.log('Primary drawer command failed, trying alternative...');
        const altCommand = ESCPOSFormatter.openCashDrawerAlt();
        success = await this.sendDataToPrinter(printer, altCommand);
      }

      if (success) {
        console.log('✅ Cash drawer test successful');
      } else {
        console.log('❌ Cash drawer test failed - drawer may not be connected');
      }

      return success;
    } catch (error) {
      console.error('Cash drawer test failed:', error);
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

        // Try known write characteristic UUIDs first (prioritize different characteristics for large data)
        const knownWriteCharacteristics = [
          '00002af1-0000-1000-8000-00805f9b34fb', // Capacitor BLE write characteristic (try this first for large data)
          '49535343-aca3-481c-91ec-d85e28a60318', // Alternative write characteristic with notify
          '49535343-8841-43f4-a8d4-ecbe34729bb3', // Common thermal printer write characteristic
          '0000ff03-0000-1000-8000-00805f9b34fb'  // Another common write characteristic
        ];

        // First try to find a known write characteristic
        for (const knownUuid of knownWriteCharacteristics) {
          writeCharacteristic = characteristics.find(c =>
            c.uuid.toLowerCase() === knownUuid.toLowerCase() &&
            (c.properties.write || c.properties.writeWithoutResponse)
          );
          if (writeCharacteristic) {
            console.log(`Found known write characteristic: ${writeCharacteristic.uuid}`);
            break;
          }
        }

        // If no known characteristic found, find any characteristic that supports writing
        if (!writeCharacteristic) {
          writeCharacteristic = characteristics.find(c =>
            c.properties.write || c.properties.writeWithoutResponse
          );
        }

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

      // Step 4: Send data to printer (with chunking for large data)
      console.log('Sending data to printer...');
      console.log(`Using write characteristic: ${writeCharacteristic.uuid}`);
      console.log(`Characteristic properties:`, writeCharacteristic.properties);

      // Use smaller chunk size for better compatibility
      const maxChunkSize = 256; // Reduced from 512 for better compatibility
      const totalBytes = dataBytes.length;

      if (totalBytes <= maxChunkSize) {
        // Send small data in one chunk
        console.log(`Sending ${totalBytes} bytes in single chunk...`);

        if (writeCharacteristic.properties.writeWithoutResponse) {
          console.log('Using writeWithoutResponse...');
          await writeCharacteristic.writeValueWithoutResponse(dataBytes);
        } else if (writeCharacteristic.properties.write) {
          console.log('Using writeValue...');
          await writeCharacteristic.writeValue(dataBytes);
        } else {
          throw new Error('Characteristic does not support writing');
        }
      } else {
        // Send large data in chunks
        const numChunks = Math.ceil(totalBytes / maxChunkSize);
        console.log(`Sending ${totalBytes} bytes in ${numChunks} chunks of max ${maxChunkSize} bytes each...`);

        for (let i = 0; i < numChunks; i++) {
          const start = i * maxChunkSize;
          const end = Math.min(start + maxChunkSize, totalBytes);
          const chunk = dataBytes.slice(start, end);

          console.log(`Sending chunk ${i + 1}/${numChunks}: ${chunk.length} bytes (${start}-${end - 1})`);

          try {
            if (writeCharacteristic.properties.writeWithoutResponse) {
              await writeCharacteristic.writeValueWithoutResponse(chunk);
            } else if (writeCharacteristic.properties.write) {
              await writeCharacteristic.writeValue(chunk);
            } else {
              throw new Error('Characteristic does not support writing');
            }

            console.log(`✅ Chunk ${i + 1}/${numChunks} sent successfully`);
          } catch (chunkError) {
            console.error(`❌ Failed to send chunk ${i + 1}/${numChunks}:`, chunkError);
            throw new Error(`Failed to send data chunk ${i + 1}: ${chunkError.message}`);
          }

          // Longer delay between chunks to ensure printer can process
          if (i < numChunks - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        console.log(`✅ All ${numChunks} chunks sent successfully`);
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
    store?: Store,
    cashierName?: string
  ): string {
    let receipt = ESCPOSFormatter.init();

    // Use normal font for visibility
    receipt += ESCPOSFormatter.useNormalFont();

    // BIR-COMPLIANT HEADER SECTION
    receipt += ESCPOSFormatter.center();
    
    // Business Name (taxpayer registered name)
    const businessName = store?.business_name || store?.name || 'THE CROFFLE STORE';
    receipt += ESCPOSFormatter.bold(businessName);
    receipt += ESCPOSFormatter.lineFeed();
    
    // Store address (detailed business address)
    const address = store?.address || 'IT Park, Lahug, Cebu City';
    const cityState = `${store?.city || 'Cebu City'}, ${store?.country || 'Philippines'}`;
    receipt += address.substring(0, 32) + ESCPOSFormatter.lineFeed();
    receipt += cityState.substring(0, 32) + ESCPOSFormatter.lineFeed();
    
    // VAT Registration Status & TIN with enhanced compliance
    const vatStatus = store?.is_vat_registered !== false ? 'VAT-REGISTERED' : 'NON-VAT';
    receipt += ESCPOSFormatter.bold(vatStatus) + ESCPOSFormatter.lineFeed();
    
    // Show EXEMPT marking for non-VAT taxpayers
    if (store?.is_vat_registered === false) {
      receipt += ESCPOSFormatter.bold('EXEMPT') + ESCPOSFormatter.lineFeed();
    }
    
    const tin = store?.tin || '000-000-000-000';
    receipt += `TIN: ${tin}` + ESCPOSFormatter.lineFeed();
    
    // Machine identification
    const serialNumber = store?.machine_serial_number || 'N/A';
    const machineAccred = store?.machine_accreditation_number || 'N/A';
    receipt += `SN: ${serialNumber.substring(0, 20)}` + ESCPOSFormatter.lineFeed();
    receipt += `MIN: ${machineAccred.substring(0, 20)}` + ESCPOSFormatter.lineFeed();
    
    // BIR Final Permit Number
    if (store?.bir_final_permit_number) {
      receipt += `PTU: ${store.bir_final_permit_number.substring(0, 20)}` + ESCPOSFormatter.lineFeed();
    }
    
    receipt += ESCPOSFormatter.lineFeed();
    const docType = store?.is_bir_accredited ? 'SALES INVOICE' : 'SALES RECEIPT';
    receipt += ESCPOSFormatter.bold(docType) + ESCPOSFormatter.lineFeed();
    receipt += ESCPOSFormatter.left();
    
    // Add cashier information
    if (cashierName) {
      receipt += ESCPOSFormatter.formatLine('Cashier:', cashierName.substring(0, 20));
    }

    // Transaction details with BIR requirements
    receipt += ESCPOSFormatter.formatLine(
      'SI No:',
      transaction.receiptNumber.substring(0, 15)
    );
    receipt += ESCPOSFormatter.formatLine(
      'Date:',
      new Date(transaction.createdAt).toLocaleDateString('en-PH', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      })
    );
    receipt += ESCPOSFormatter.formatLine(
      'Time:',
      new Date(transaction.createdAt).toLocaleTimeString('en-PH', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })
    );
    receipt += ESCPOSFormatter.formatLine(
      'Terminal:',
      transaction.terminal_id || 'TERMINAL-01'
    );
    
    // Customer information section with TIN space
    if (customer) {
      receipt += ESCPOSFormatter.lineFeed();
      receipt += ESCPOSFormatter.formatLine('Customer:', customer.name.substring(0, 20));
      if (customer.address) {
        receipt += ESCPOSFormatter.formatLine('Address:', customer.address.substring(0, 25));
      }
      if (customer.tin) {
        receipt += ESCPOSFormatter.formatLine('TIN:', customer.tin);
      } else {
        receipt += 'TIN: _________________' + ESCPOSFormatter.lineFeed();
      }
    } else {
      receipt += ESCPOSFormatter.lineFeed();
      receipt += 'Customer: _______________' + ESCPOSFormatter.lineFeed();
      receipt += 'Address: ________________' + ESCPOSFormatter.lineFeed();
      receipt += 'TIN: ____________________' + ESCPOSFormatter.lineFeed();
    }

    receipt += ESCPOSFormatter.horizontalLine();

    // Items with detailed description
    receipt += ESCPOSFormatter.bold('DESCRIPTION') + ESCPOSFormatter.lineFeed();
    transaction.items.forEach(item => {
      const itemName = item.name.length > 28 ? item.name.substring(0, 25) + '...' : item.name;
      receipt += itemName + ESCPOSFormatter.lineFeed();

      const unitPrice = item.unitPrice.toFixed(2);
      const totalPrice = item.totalPrice.toFixed(2);
      receipt += ESCPOSFormatter.formatLine(
        ` ${item.quantity} x P${unitPrice}`,
        `P${totalPrice}`
      );
    });

    receipt += ESCPOSFormatter.horizontalLine();
    
    // VAT BREAKDOWN (BIR Required)
    const vatableSales = transaction.vat_sales || (transaction.subtotal - (transaction.discount || 0));
    const vatExemptSales = transaction.vat_exempt_sales || 0;
    const zeroRatedSales = transaction.zero_rated_sales || 0;
    const vatAmount = transaction.tax || 0;
    
    receipt += ESCPOSFormatter.formatLine(
      'VATable Sales:',
      `P${vatableSales.toFixed(2)}`
    );
    
    if (vatExemptSales > 0) {
      receipt += ESCPOSFormatter.formatLine(
        'VAT-Exempt Sales:',
        `P${vatExemptSales.toFixed(2)}`
      );
    }
    
    if (zeroRatedSales > 0) {
      receipt += ESCPOSFormatter.formatLine(
        'Zero Rated Sales:',
        `P${zeroRatedSales.toFixed(2)}`
      );
    }
    
    receipt += ESCPOSFormatter.formatLine(
      'VAT Amount (12%):',
      `P${vatAmount.toFixed(2)}`
    );

    // Discount breakdown (BIR compliance for PWD/Senior)
    if (transaction.discount > 0) {
      receipt += ESCPOSFormatter.lineFeed();
      const discountType = transaction.discountType || 'regular';
      let discountLabel = 'Discount:';
      
      if (discountType === 'senior') {
        discountLabel = 'Senior Citizen Disc:';
      } else if (discountType === 'pwd') {
        discountLabel = 'PWD Discount:';
      }
      
      receipt += ESCPOSFormatter.formatLine(
        discountLabel,
        `-P${transaction.discount.toFixed(2)}`
      );
      
      if (transaction.discountIdNumber) {
        receipt += ESCPOSFormatter.formatLine(
          'ID Number:',
          transaction.discountIdNumber
        );
      }
    }

    receipt += ESCPOSFormatter.horizontalLine();
    receipt += ESCPOSFormatter.bold(
      ESCPOSFormatter.formatLine(
        'AMOUNT DUE:',
        `P${transaction.total.toFixed(2)}`
      )
    );
    
    // Payment details
    receipt += ESCPOSFormatter.lineFeed();
    receipt += ESCPOSFormatter.formatLine(
      'Payment Method:',
      transaction.paymentMethod.toUpperCase()
    );

    if (transaction.paymentMethod === 'cash') {
      receipt += ESCPOSFormatter.formatLine(
        'Amount Tendered:',
        `P${(transaction.amountTendered || 0).toFixed(2)}`
      );
      receipt += ESCPOSFormatter.formatLine(
        'Change:',
        `P${(transaction.change || 0).toFixed(2)}`
      );
    }

    // BIR COMPLIANCE FOOTER
    receipt += ESCPOSFormatter.lineFeed(2);
    receipt += ESCPOSFormatter.center();
    
    // Accredited supplier information (enhanced BIR compliance)
    if (store?.supplier_name) {
      receipt += 'Accredited System Provider:' + ESCPOSFormatter.lineFeed();
      receipt += store.supplier_name.substring(0, 32) + ESCPOSFormatter.lineFeed();
      if (store.supplier_tin) {
        receipt += `TIN: ${store.supplier_tin}` + ESCPOSFormatter.lineFeed();
      }
      if (store.accreditation_number) {
        receipt += `Accred No: ${store.accreditation_number}` + ESCPOSFormatter.lineFeed();
      }
      if (store.supplier_address) {
        receipt += store.supplier_address.substring(0, 32) + ESCPOSFormatter.lineFeed();
      }
      if (store.accreditation_date) {
        receipt += `Date: ${store.accreditation_date}` + ESCPOSFormatter.lineFeed();
      }
    } else {
      // Fallback to default if not configured
      receipt += 'Accredited System Provider:' + ESCPOSFormatter.lineFeed();
      receipt += 'CROFFLE TECH SOLUTIONS' + ESCPOSFormatter.lineFeed();
      receipt += 'TIN: 987-654-321-000' + ESCPOSFormatter.lineFeed();
      receipt += 'Accred No: A123456789' + ESCPOSFormatter.lineFeed();
    }
    
    if (store?.bir_final_permit_number) {
      receipt += `PTU No: ${store.bir_final_permit_number}` + ESCPOSFormatter.lineFeed();
    }
    
    receipt += ESCPOSFormatter.lineFeed();
    
    // BIR validity statement (enhanced)
    if (store?.validity_statement) {
      const validityLines = store.validity_statement.match(/.{1,32}/g) || [];
      receipt += ESCPOSFormatter.bold(validityLines.join(ESCPOSFormatter.lineFeed()));
    } else {
      // Fallback to default validity statement
      receipt += ESCPOSFormatter.bold(
        'THIS INVOICE/RECEIPT SHALL BE' + ESCPOSFormatter.lineFeed() +
        'VALID FOR FIVE (5) YEARS FROM' + ESCPOSFormatter.lineFeed() +
        'THE DATE OF THE PERMIT TO USE.'
      );
    }
    
    // Add NON-VAT disclaimer if applicable (enhanced)
    if (store?.is_vat_registered === false) {
      receipt += ESCPOSFormatter.lineFeed(2);
      if (store?.non_vat_disclaimer) {
        const disclaimerLines = store.non_vat_disclaimer.match(/.{1,32}/g) || [];
        receipt += ESCPOSFormatter.bold(disclaimerLines.join(ESCPOSFormatter.lineFeed()));
      } else {
        // Fallback to default disclaimer
        receipt += ESCPOSFormatter.bold(
          'THIS DOCUMENT IS NOT VALID' + ESCPOSFormatter.lineFeed() +
          'FOR CLAIM OF INPUT TAX'
        );
      }
    }
    
    receipt += ESCPOSFormatter.lineFeed(2);
    receipt += 'Thank you for your purchase!' + ESCPOSFormatter.lineFeed();
    receipt += ESCPOSFormatter.qrCode(transaction.receiptNumber);
    receipt += ESCPOSFormatter.lineFeed(3);
    receipt += ESCPOSFormatter.cut();

    return receipt;
  }
  
  private static formatTestReceipt(): string {
    let receipt = ESCPOSFormatter.init();

    // Use normal font for visibility
    receipt += ESCPOSFormatter.useNormalFont();

    // Header
    receipt += ESCPOSFormatter.center();
    receipt += ESCPOSFormatter.bold('TEST RECEIPT');
    receipt += ESCPOSFormatter.lineFeed(2);
    receipt += ESCPOSFormatter.left();

    // Test information
    receipt += 'Printer connection: OK' + ESCPOSFormatter.lineFeed();
    receipt += 'Date: ' + new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    }) + ESCPOSFormatter.lineFeed();
    receipt += 'Time: ' + new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }) + ESCPOSFormatter.lineFeed();

    // Test formatting
    receipt += ESCPOSFormatter.horizontalLine();
    receipt += ESCPOSFormatter.formatLine('Test Item', 'P10.00');
    receipt += ESCPOSFormatter.formatLine('Quantity:', '1');
    receipt += ESCPOSFormatter.horizontalLine();
    receipt += ESCPOSFormatter.formatLine('Total:', 'P10.00');

    // Footer
    receipt += ESCPOSFormatter.lineFeed(2);
    receipt += ESCPOSFormatter.center();
    receipt += 'Thermal printing ready!' + ESCPOSFormatter.lineFeed(3);
    receipt += ESCPOSFormatter.cut();

    return receipt;
  }
}
