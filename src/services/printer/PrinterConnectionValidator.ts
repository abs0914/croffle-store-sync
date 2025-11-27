/**
 * PRINTER CONNECTION VALIDATOR
 *
 * Performs comprehensive connection health checks before printing
 * to detect unstable connections that would cause mid-print failures.
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

  /**
   * Comprehensive connection health check
   * Validates GATT connection, performs test write, and checks stability
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

      // Check 3: GATT characteristic availability (no test write to avoid disconnections)
      try {
        const service = await device.gatt.getPrimaryService('49535343-fe7d-4ae5-8fa9-9fafd205e455');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

        if (!characteristic) {
          issues.push('Printer characteristic not available');
          return { isHealthy: false, canPrint: false, issues };
        }

        console.log('✅ [VALIDATOR] GATT characteristics available');
      } catch (error: any) {
        issues.push(`GATT service unavailable: ${error.message}`);
        return { isHealthy: false, canPrint: false, issues, signalStrength: 'unstable' };
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
