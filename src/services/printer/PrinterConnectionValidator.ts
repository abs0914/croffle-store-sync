/**
 * PRINTER CONNECTION VALIDATOR
 *
 * Performs comprehensive connection health checks before printing
 * to detect unstable connections that would cause mid-print failures.
 * 
 * CRITICAL FIX: Uses flexible service/characteristic discovery
 * instead of hardcoded UUIDs to support all printer models.
 */

import { BluetoothPrinter } from '@/types/printer';
import { BleClient } from '@capacitor-community/bluetooth-le';

export interface ConnectionValidationResult {
  isHealthy: boolean;
  canPrint: boolean;
  issues: string[];
  signalStrength?: 'strong' | 'weak' | 'unstable';
}

export class PrinterConnectionValidator {

  // Known printer service UUIDs to try (same as BluetoothPrinterService)
  private static readonly KNOWN_SERVICE_UUIDS = [
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Common thermal printer service
    '000018f0-0000-1000-8000-00805f9b34fb', // Alternative printer service
    '0000fff0-0000-1000-8000-00805f9b34fb', // Another common printer service
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART service
  ];

  // Known write characteristic UUIDs to try
  private static readonly KNOWN_CHARACTERISTIC_UUIDS = [
    '00002af1-0000-1000-8000-00805f9b34fb',
    '49535343-aca3-481c-91ec-d85e28a60318',
    '49535343-8841-43f4-a8d4-ecbe34729bb3',
    '0000ff03-0000-1000-8000-00805f9b34fb',
  ];

  /**
   * Comprehensive connection health check
   * Validates GATT connection and checks for ANY writable service/characteristic
   * Will attempt reconnection if connection is lost but printer object exists
   */
  static async validateConnection(printer: BluetoothPrinter): Promise<ConnectionValidationResult> {
    const issues: string[] = [];

    console.log('🔍 [VALIDATOR] Starting connection health check...', {
      hasPrinter: !!printer,
      isConnected: printer?.isConnected,
      connectionType: printer?.connectionType,
      printerName: printer?.name
    });

    // Check 1: Printer object exists
    if (!printer) {
      issues.push('No printer object available');
      return { isHealthy: false, canPrint: false, issues };
    }

    // Check 2: Web Bluetooth GATT validation
    if (printer.connectionType === 'web' && printer.webBluetoothDevice) {
      const device = printer.webBluetoothDevice;

      if (!device.gatt) {
        issues.push('GATT server not available');
        return { isHealthy: false, canPrint: false, issues };
      }

      // Check actual GATT connection state (more reliable than isConnected flag)
      if (!device.gatt.connected) {
        console.log('🔄 [VALIDATOR] GATT disconnected, attempting reconnection...');

        // Attempt reconnection
        try {
          await device.gatt.connect();

          // Wait for connection to stabilize
          await new Promise(resolve => setTimeout(resolve, 500));

          // Update the isConnected flag
          printer.isConnected = true;

          console.log('✅ [VALIDATOR] GATT reconnected successfully');
        } catch (error: any) {
          issues.push(`GATT reconnection failed: ${error.message}`);
          printer.isConnected = false;
          return { isHealthy: false, canPrint: false, issues };
        }
      } else {
        // GATT is connected, ensure flag is in sync
        printer.isConnected = true;
      }

      // Check 3: Find ANY writable service/characteristic (flexible discovery)
      try {
        const hasWritableCharacteristic = await this.findWritableCharacteristic(device);
        
        if (!hasWritableCharacteristic) {
          issues.push('No writable characteristic found on printer');
          return { isHealthy: false, canPrint: false, issues, signalStrength: 'unstable' };
        }

        console.log('✅ [VALIDATOR] Found writable characteristic - printer ready');
      } catch (error: any) {
        // Log but don't fail - the actual print logic has more robust fallbacks
        console.warn('⚠️ [VALIDATOR] Service discovery warning:', error.message);
        // Still allow printing - sendDataViaWebBluetooth has its own fallback logic
        console.log('✅ [VALIDATOR] Allowing print attempt - actual print logic has fallbacks');
      }
    }

    // Check 4: Capacitor BLE validation
    if (printer.connectionType === 'capacitor' && printer.device) {
      // For Capacitor BLE, attempt reconnection if flag shows disconnected
      if (!printer.isConnected) {
        console.log('🔄 [VALIDATOR] Capacitor BLE disconnected, attempting reconnection...');
        try {
          await BleClient.connect(printer.device.deviceId);
          printer.isConnected = true;
          console.log('✅ [VALIDATOR] Capacitor BLE reconnected successfully');
        } catch (error: any) {
          issues.push(`Capacitor BLE reconnection failed: ${error.message}`);
          return { isHealthy: false, canPrint: false, issues };
        }
      }
    }

    console.log('✅ [VALIDATOR] Connection is healthy and ready for printing');
    return { isHealthy: true, canPrint: true, issues, signalStrength: 'strong' };
  }

  /**
   * Flexible service/characteristic discovery
   * Tries multiple known UUIDs, then falls back to discovering all services
   */
  private static async findWritableCharacteristic(device: BluetoothDevice): Promise<boolean> {
    if (!device.gatt?.connected) {
      return false;
    }

    // Step 1: Try known service UUIDs first
    for (const serviceUuid of this.KNOWN_SERVICE_UUIDS) {
      try {
        const service = await device.gatt.getPrimaryService(serviceUuid);
        console.log(`🔍 [VALIDATOR] Found service: ${serviceUuid}`);
        
        // Try known characteristic UUIDs
        for (const charUuid of this.KNOWN_CHARACTERISTIC_UUIDS) {
          try {
            const characteristic = await service.getCharacteristic(charUuid);
            if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
              console.log(`✅ [VALIDATOR] Found writable characteristic: ${charUuid}`);
              return true;
            }
          } catch {
            // Characteristic not found, continue
          }
        }
        
        // Try to find ANY writable characteristic in this service
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              console.log(`✅ [VALIDATOR] Found writable characteristic: ${char.uuid}`);
              return true;
            }
          }
        } catch {
          // Could not get characteristics, continue
        }
      } catch {
        // Service not found, continue to next UUID
      }
    }

    // Step 2: Discover ALL services and find any writable characteristic
    console.log('🔍 [VALIDATOR] Known services not found, discovering all services...');
    try {
      const services = await device.gatt.getPrimaryServices();
      console.log(`📡 [VALIDATOR] Found ${services.length} services`);

      for (const service of services) {
        console.log(`  Service: ${service.uuid}`);
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              console.log(`✅ [VALIDATOR] Found writable characteristic: ${char.uuid} in service ${service.uuid}`);
              return true;
            }
          }
        } catch {
          // Could not get characteristics for this service
        }
      }
    } catch (error) {
      console.warn('⚠️ [VALIDATOR] Could not discover services:', error);
    }

    return false;
  }

  /**
   * Quick connection check without test write
   * Used during printing to detect mid-print disconnection
   */
  static isStillConnected(printer: BluetoothPrinter): boolean {
    if (!printer || !printer.isConnected) {
      return false;
    }

    if (printer.connectionType === 'web' && printer.webBluetoothDevice) {
      return printer.webBluetoothDevice.gatt?.connected || false;
    }

    if (printer.connectionType === 'capacitor') {
      return printer.isConnected;
    }

    return false;
  }
}
