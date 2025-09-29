
import { BleClient, BleDevice } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import { BluetoothPrinter, ThermalPrinter, PrinterType } from '@/types/printer';
import { PrinterTypeManager } from './PrinterTypeManager';

// Legacy export for backward compatibility
export type { ThermalPrinter, BluetoothPrinter };

export class PrinterDiscovery {
  private static connectedPrinter: BluetoothPrinter | null = null;
  private static discoveredDevices: Map<string, BleDevice> = new Map();

  static async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing Bluetooth services...');
      
      // Check if we're in a supported environment
      if (typeof window === 'undefined') {
        throw new Error('Bluetooth not available in server environment');
      }

      // Log platform information for debugging
      console.log('PrinterDiscovery.initialize() - Platform info:', {
        isNativePlatform: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        isPluginAvailable: Capacitor.isPluginAvailable('BluetoothLe'),
        userAgent: navigator.userAgent
      });

      // Detect environment
      const isCapacitor = this.isCapacitorEnvironment();
      const hasWebBluetooth = this.hasWebBluetoothSupport();
      
      console.log(`📱 Environment: ${isCapacitor ? 'Capacitor Mobile App' : 'Web Browser'}`);
      console.log(`🌐 Web Bluetooth: ${hasWebBluetooth ? 'Available' : 'Not Available'}`);

      if (isCapacitor) {
        // Initialize Capacitor Bluetooth LE
        await BleClient.initialize({
          androidNeverForLocation: false // Required for Android BLE scanning
        });
        console.log('✅ Capacitor Bluetooth LE initialized successfully');
      } else if (hasWebBluetooth) {
        // Check Web Bluetooth availability
        const available = await navigator.bluetooth.getAvailability();
        if (!available) {
          throw new Error('Web Bluetooth not available - check browser support and permissions');
        }
        console.log('✅ Web Bluetooth API available');
      } else {
        throw new Error('No Bluetooth support detected - requires Web Bluetooth API or Capacitor environment');
      }
      
    } catch (error: any) {
      console.error('❌ Failed to initialize Bluetooth:', error);

      // Provide specific error messages
      if (error.message?.includes('not supported')) {
        throw new Error('Bluetooth not supported on this device');
      } else if (error.message?.includes('not enabled')) {
        throw new Error('Bluetooth not enabled on this device');
      } else if (error.message?.includes('permission')) {
        throw new Error('Bluetooth permissions denied - please enable in device settings');
      } else {
        throw new Error('Bluetooth not available on this device');
      }
    }
  }

  private static isCapacitorEnvironment(): boolean {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  }

  private static hasWebBluetoothSupport(): boolean {
    return typeof window !== 'undefined' && 'bluetooth' in navigator;
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

  static async scanForPrinters(showNativeDialog: boolean = false): Promise<BluetoothPrinter[]> {
    try {
      console.log('🔍 Starting printer discovery...');
      
      // Clear previous scan results
      this.discoveredDevices.clear();

      // Check if we're running in a Capacitor native app
      if (Capacitor.isNativePlatform()) {
        console.log('Running in Capacitor native app - using Capacitor BLE');
        return await this.scanWithCapacitorBLE();
      }

      // Check if we're in a web environment and use Web Bluetooth API
      if (typeof window !== 'undefined' && 'bluetooth' in navigator) {
        // For web environments, we can optionally show the native dialog
        if (showNativeDialog) {
          return await this.scanWithWebBluetooth();
        } else {
          // Return empty array to trigger custom dialog in web environment
          return [];
        }
      } else {
        throw new Error('No Bluetooth scanning method available - requires Web Bluetooth API or Capacitor environment');
      }

      // Fallback to Capacitor BLE for mobile apps
      return await this.scanWithCapacitorBLE();
    } catch (error) {
      console.error('❌ Printer discovery failed:', error);
      throw error;
    }
  }

  private static async scanWithWebBluetooth(): Promise<BluetoothPrinter[]> {
    console.log('Using Web Bluetooth API for scanning...');

    try {
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

      // Convert to our BluetoothPrinter format
      const printer: BluetoothPrinter = {
        id: device.id,
        name: device.name || 'Unknown Printer',
        isConnected: false,
        webBluetoothDevice: device,
        connectionType: 'web'
      };
      
      // Detect printer type and set capabilities
      printer.printerType = PrinterTypeManager.detectPrinterType(printer);
      printer.capabilities = PrinterTypeManager.getCapabilities(printer.printerType);

      return [printer];
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log('No thermal printers found with Web Bluetooth filters');
        return [];
      }
      throw error;
    }
  }

  private static async scanWithCapacitorBLE(): Promise<BluetoothPrinter[]> {
    console.log('Using Capacitor BLE for scanning...');

    try {
      // Request permissions first
      await this.requestPermissions();
      console.log('✅ Bluetooth permissions confirmed');
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      throw error;
    }

    console.log('🚀 Starting Bluetooth LE scan for thermal printers...');

    try {
      // Start scanning with enhanced callback to collect devices
      await BleClient.requestLEScan(
        {
          services: [], // Scan for all devices, filter later
          allowDuplicates: false,
          // Android-specific optimizations
          scanMode: 'lowPowerScan' as any, // Balance between power and discovery speed
        },
        (result) => {
          const deviceName = result.device.name || result.device.deviceId || 'Unknown';
          console.log(`📱 Found BLE device: "${deviceName}" (${result.device.deviceId}) RSSI: ${result.rssi}dBm`);
          
          // Store device with additional metadata
          this.discoveredDevices.set(result.device.deviceId, {
            ...result.device,
            rssi: result.rssi // Store signal strength for debugging
          } as any);
        }
      );

      console.log('⏱️ Scanning for 10 seconds...');
      
      // Scan for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Stop scanning
      await BleClient.stopLEScan();
      console.log(`✅ Scan completed. Found ${this.discoveredDevices.size} BLE devices total.`);

    } catch (scanError: any) {
      console.error('❌ BLE scan failed:', scanError);
      
      // Try to stop scanning in case it's still running
      try {
        await BleClient.stopLEScan();
      } catch (stopError) {
        console.error('Failed to stop scan:', stopError);
      }
      
      // Provide specific error messages based on the error
      if (scanError.message?.includes('permission')) {
        throw new Error('Bluetooth scanning permissions denied. Please check app permissions in Android settings.');
      } else if (scanError.message?.includes('location')) {
        throw new Error('Location services required for Bluetooth scanning on Android. Please enable location access.');
      } else if (scanError.message?.includes('not enabled')) {
        throw new Error('Bluetooth not enabled. Please turn on Bluetooth in device settings.');
      } else {
        throw new Error(`Bluetooth scan failed: ${scanError.message || 'Unknown error'}`);
      }
    }

    // Filter for thermal printers based on device names
    const printers: BluetoothPrinter[] = [];
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

    // Process discovered devices and filter for thermal printers
    console.log('🔎 Analyzing discovered devices for thermal printer patterns...');
    
    for (const [deviceId, device] of this.discoveredDevices) {
      const deviceName = device.name || 'Unknown Device';
      const deviceInfo = `"${deviceName}" (${deviceId})`;
      
      console.log(`📋 Checking device: ${deviceInfo}`);

      // Check if device name matches thermal printer patterns
      const matchedPatterns = thermalPrinterPatterns.filter(pattern => pattern.test(deviceName));
      const isThermalPrinter = matchedPatterns.length > 0;
      
      // Also check for generic "print" keyword as fallback
      const hasGenericPrint = deviceName.toLowerCase().includes('print');

      if (isThermalPrinter || hasGenericPrint) {
        const printer: BluetoothPrinter = {
          id: deviceId,
          name: deviceName,
          isConnected: false,
          device: device,
          connectionType: 'capacitor'
        };
        
        // Detect printer type and set capabilities
        printer.printerType = PrinterTypeManager.detectPrinterType(printer);
        printer.capabilities = PrinterTypeManager.getCapabilities(printer.printerType);
        
        printers.push(printer);
        
        if (isThermalPrinter) {
          console.log(`✅ Identified thermal printer: ${deviceInfo} -> Patterns: [${matchedPatterns.map(p => p.source).join(', ')}] -> Type: ${printer.printerType}`);
        } else {
          console.log(`⚠️ Potential printer (generic): ${deviceInfo} -> Type: ${printer.printerType}`);
        }
      } else {
        console.log(`❌ Skipped non-printer device: ${deviceInfo}`);
      }
    }

    console.log(`🎯 Found ${printers.length} thermal printer(s) out of ${this.discoveredDevices.size} total BLE devices`);
    
    // If no printers found, provide helpful debug info
    if (printers.length === 0) {
      console.log('🔍 Debug: All discovered devices:');
      for (const [deviceId, device] of this.discoveredDevices) {
        console.log(`  - "${device.name || 'Unnamed Device'}" (${deviceId})`);
      }
      console.log('💡 Tip: Make sure your thermal printer is:');
      console.log('  1. Powered on');
      console.log('  2. In Bluetooth pairing mode');
      console.log('  3. Named with recognizable printer keywords');
    }
    
    return printers;
  }
  
  static async connectToPrinter(printer: BluetoothPrinter): Promise<boolean> {
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

  private static async connectWithWebBluetooth(printer: BluetoothPrinter): Promise<boolean> {
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

  private static async connectWithCapacitorBLE(printer: BluetoothPrinter): Promise<boolean> {
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
  
  static getConnectedPrinter(): BluetoothPrinter | null {
    return this.connectedPrinter;
  }
  
  static isConnected(): boolean {
    return this.connectedPrinter?.isConnected || false;
  }
}
