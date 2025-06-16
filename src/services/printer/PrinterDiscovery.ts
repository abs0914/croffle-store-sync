
import { BleClient, BleDevice } from '@capacitor-community/bluetooth-le';

export interface ThermalPrinter {
  id: string;
  name: string;
  isConnected: boolean;
  device?: BleDevice;
  webBluetoothDevice?: BluetoothDevice; // For Web Bluetooth API
  connectionType?: 'web' | 'capacitor'; // Track connection type
}

export class PrinterDiscovery {
  private static connectedPrinter: ThermalPrinter | null = null;
  private static discoveredDevices: Map<string, BleDevice> = new Map();

  static async initialize(): Promise<void> {
    try {
      // Check if we're in a supported environment
      if (typeof window === 'undefined') {
        throw new Error('Bluetooth not available in server environment');
      }

      // Initialize Bluetooth LE client
      await BleClient.initialize();
      console.log('Bluetooth LE initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize Bluetooth:', error);

      // Provide specific error messages
      if (error.message?.includes('not supported')) {
        throw new Error('Bluetooth not supported on this device');
      } else if (error.message?.includes('not enabled')) {
        throw new Error('Bluetooth not enabled on this device');
      } else {
        throw new Error('Bluetooth not available on this device');
      }
    }
  }

  static async requestPermissions(): Promise<boolean> {
    try {
      // Request Bluetooth permissions
      await BleClient.requestLEScan({}, () => {});
      await BleClient.stopLEScan();
      return true;
    } catch (error) {
      console.error('Bluetooth permissions denied:', error);
      return false;
    }
  }

  static async scanForPrinters(): Promise<ThermalPrinter[]> {
    try {
      // Clear previous scan results
      this.discoveredDevices.clear();

      // Check if we're in a web environment and use Web Bluetooth API
      if (typeof window !== 'undefined' && 'bluetooth' in navigator) {
        return await this.scanWithWebBluetooth();
      }

      // Fallback to Capacitor BLE for mobile apps
      return await this.scanWithCapacitorBLE();
    } catch (error) {
      console.error('Failed to scan for printers:', error);
      throw error;
    }
  }

  private static async scanWithWebBluetooth(): Promise<ThermalPrinter[]> {
    console.log('Using Web Bluetooth API for scanning...');

    try {
      // Check if Bluetooth is available
      const available = await navigator.bluetooth.getAvailability();
      if (!available) {
        throw new Error('Bluetooth not available on this device');
      }

      // Request device with thermal printer filters
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'POS' },
          { namePrefix: 'Thermal' },
          { namePrefix: 'Printer' },
          { namePrefix: 'BT-' },
          { namePrefix: 'TP-' },
          { namePrefix: 'EPSON' },
          { namePrefix: 'CITIZEN' },
          { namePrefix: 'STAR' },
          { namePrefix: 'BIXOLON' },
          { namePrefix: 'SEWOO' },
          { namePrefix: 'CUSTOM' },
          { namePrefix: 'GOOJPRT' },
          { namePrefix: 'MUNBYN' },
          { namePrefix: 'RONGTA' },
          { namePrefix: 'XPRINTER' }
        ],
        optionalServices: [
          'battery_service',
          'device_information',
          // Common thermal printer service UUIDs
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Common thermal printer service
          '000018f0-0000-1000-8000-00805f9b34fb', // Alternative printer service
          '0000fff0-0000-1000-8000-00805f9b34fb', // Another common printer service
          '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART service (sometimes used)
          '12345678-1234-1234-1234-123456789abc'  // Generic printer service
        ]
      });

      console.log(`Found thermal printer via Web Bluetooth: ${device.name}`);

      // Convert to our ThermalPrinter format
      const printer: ThermalPrinter = {
        id: device.id,
        name: device.name || 'Unknown Printer',
        isConnected: false,
        webBluetoothDevice: device,
        connectionType: 'web',
        device: {
          deviceId: device.id,
          name: device.name || 'Unknown Printer',
          uuids: []
        }
      };

      return [printer];
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log('No thermal printers found with Web Bluetooth filters');
        return [];
      }
      throw error;
    }
  }

  private static async scanWithCapacitorBLE(): Promise<ThermalPrinter[]> {
    console.log('Using Capacitor BLE for scanning...');

    // Request permissions first
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Bluetooth permissions required');
    }

    console.log('Starting Bluetooth LE scan for thermal printers...');

    // Start scanning with callback to collect devices
    await BleClient.requestLEScan(
      {
        services: [], // Scan for all devices, filter later
        allowDuplicates: false
      },
      (result) => {
        console.log('Found device:', result);
        this.discoveredDevices.set(result.device.deviceId, result.device);
      }
    );

    // Scan for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Stop scanning
    await BleClient.stopLEScan();
    console.log(`Scan completed. Found ${this.discoveredDevices.size} devices.`);

    // Filter for thermal printers based on device names
    const printers: ThermalPrinter[] = [];
    const thermalPrinterPatterns = [
      /thermal/i,
      /printer/i,
      /pos/i,
      /receipt/i,
      /bluetooth.*print/i,
      /print.*bluetooth/i,
      /^POS-/i,
      /^BT-/i,
      /^TP-/i,
      /ESC.*POS/i,
      /EPSON/i,
      /CITIZEN/i,
      /STAR/i,
      /BIXOLON/i,
      /SEWOO/i,
      /CUSTOM/i,
      /GOOJPRT/i,
      /MUNBYN/i,
      /RONGTA/i,
      /XPRINTER/i
    ];

    for (const [deviceId, device] of this.discoveredDevices) {
      const deviceName = device.name || 'Unknown Device';

      // Check if device name matches thermal printer patterns
      const isThermalPrinter = thermalPrinterPatterns.some(pattern =>
        pattern.test(deviceName)
      );

      if (isThermalPrinter || deviceName.toLowerCase().includes('print')) {
        printers.push({
          id: deviceId,
          name: deviceName,
          isConnected: false,
          device: device,
          connectionType: 'capacitor'
        });
        console.log(`Identified thermal printer: ${deviceName} (${deviceId})`);
      }
    }

    console.log(`Found ${printers.length} thermal printer(s)`);
    return printers;
  }
  
  static async connectToPrinter(printer: ThermalPrinter): Promise<boolean> {
    try {
      console.log(`Attempting to connect to printer: ${printer.name} (Type: ${printer.connectionType})`);

      if (printer.connectionType === 'web' && printer.webBluetoothDevice) {
        return await this.connectWithWebBluetooth(printer);
      } else if (printer.connectionType === 'capacitor' && printer.device) {
        return await this.connectWithCapacitorBLE(printer);
      } else {
        console.error('Invalid printer configuration for connection');
        return false;
      }
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      return false;
    }
  }

  private static async connectWithWebBluetooth(printer: ThermalPrinter): Promise<boolean> {
    try {
      if (!printer.webBluetoothDevice) {
        throw new Error('No Web Bluetooth device available');
      }

      console.log('Connecting via Web Bluetooth...');

      // Connect to GATT server
      const server = await printer.webBluetoothDevice.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      console.log('Connected to GATT server successfully');

      // Update printer state
      printer.isConnected = true;
      this.connectedPrinter = printer;

      // Set up disconnect listener
      printer.webBluetoothDevice.addEventListener('gattserverdisconnected', () => {
        console.log('Web Bluetooth device disconnected');
        printer.isConnected = false;
        if (this.connectedPrinter?.id === printer.id) {
          this.connectedPrinter = null;
        }
      });

      console.log('Connected to printer via Web Bluetooth:', printer.name);
      return true;
    } catch (error) {
      console.error('Web Bluetooth connection failed:', error);
      return false;
    }
  }

  private static async connectWithCapacitorBLE(printer: ThermalPrinter): Promise<boolean> {
    try {
      if (!printer.device) {
        throw new Error('No Capacitor BLE device available');
      }

      console.log('Connecting via Capacitor BLE...');

      await BleClient.connect(printer.device.deviceId);

      // Update printer state
      printer.isConnected = true;
      this.connectedPrinter = printer;

      console.log('Connected to printer via Capacitor BLE:', printer.name);
      return true;
    } catch (error) {
      console.error('Capacitor BLE connection failed:', error);
      return false;
    }
  }
  
  static async disconnectPrinter(): Promise<void> {
    if (!this.connectedPrinter) return;

    try {
      console.log(`Disconnecting printer: ${this.connectedPrinter.name} (Type: ${this.connectedPrinter.connectionType})`);

      if (this.connectedPrinter.connectionType === 'web' && this.connectedPrinter.webBluetoothDevice) {
        // Disconnect Web Bluetooth device
        if (this.connectedPrinter.webBluetoothDevice.gatt?.connected) {
          this.connectedPrinter.webBluetoothDevice.gatt.disconnect();
          console.log('Web Bluetooth device disconnected');
        }
      } else if (this.connectedPrinter.connectionType === 'capacitor' && this.connectedPrinter.device) {
        // Disconnect Capacitor BLE device
        await BleClient.disconnect(this.connectedPrinter.device.deviceId);
        console.log('Capacitor BLE device disconnected');
      }

      // Update state
      this.connectedPrinter.isConnected = false;
      this.connectedPrinter = null;
    } catch (error) {
      console.error('Failed to disconnect printer:', error);
      // Still clear the connection state even if disconnect failed
      if (this.connectedPrinter) {
        this.connectedPrinter.isConnected = false;
        this.connectedPrinter = null;
      }
    }
  }
  
  static getConnectedPrinter(): ThermalPrinter | null {
    return this.connectedPrinter;
  }
  
  static isConnected(): boolean {
    return this.connectedPrinter?.isConnected || false;
  }
}
