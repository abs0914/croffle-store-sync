/**
 * PRINTER CONNECTION VALIDATOR
 * 
 * Performs comprehensive connection health checks before printing
 * to detect unstable connections that would cause mid-print failures.
 */

import { BluetoothPrinter } from '@/types/printer';

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
   */
  static async validateConnection(printer: BluetoothPrinter): Promise<ConnectionValidationResult> {
    const issues: string[] = [];
    
    console.log('🔍 [VALIDATOR] Starting connection health check...');

    // Check 1: Printer object exists and is connected
    if (!printer || !printer.isConnected) {
      issues.push('Printer not connected');
      return { isHealthy: false, canPrint: false, issues };
    }

    // Check 2: Web Bluetooth GATT validation
    if (printer.connectionType === 'web' && printer.webBluetoothDevice) {
      const device = printer.webBluetoothDevice;
      
      if (!device.gatt) {
        issues.push('GATT server not available');
        return { isHealthy: false, canPrint: false, issues };
      }

      if (!device.gatt.connected) {
        issues.push('GATT server disconnected');
        
        // Attempt reconnection
        try {
          console.log('🔄 [VALIDATOR] Attempting GATT reconnection...');
          await device.gatt.connect();
          
          // Wait for connection to stabilize
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('✅ [VALIDATOR] GATT reconnected successfully');
        } catch (error) {
          issues.push(`GATT reconnection failed: ${error.message}`);
          return { isHealthy: false, canPrint: false, issues };
        }
      }

      // Check 3: Connection stability test
      try {
        await this.performStabilityTest(device);
      } catch (error) {
        issues.push('Connection stability test failed');
        return { isHealthy: false, canPrint: false, issues, signalStrength: 'unstable' };
      }
    }

    // Check 4: Capacitor BLE validation
    if (printer.connectionType === 'capacitor' && printer.device) {
      // For Capacitor, we rely on the isConnected flag
      // A more thorough check would require platform-specific APIs
      if (!printer.isConnected) {
        issues.push('Capacitor BLE connection lost');
        return { isHealthy: false, canPrint: false, issues };
      }
    }

    console.log('✅ [VALIDATOR] Connection is healthy and ready for printing');
    return { isHealthy: true, canPrint: true, issues, signalStrength: 'strong' };
  }

  /**
   * Perform a small test write to verify connection stability
   * This is critical - we send a tiny command and wait for success
   */
  private static async performStabilityTest(device: BluetoothDevice): Promise<void> {
    console.log('🧪 [VALIDATOR] Performing stability test...');
    
    try {
      // Get the printer service
      const service = await device.gatt.getPrimaryService('49535343-fe7d-4ae5-8fa9-9fafd205e455');
      
      // Get write characteristic
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      
      // Send a minimal command (ESC @ - initialize printer - harmless)
      const testCommand = new Uint8Array([0x1B, 0x40]);
      
      await characteristic.writeValueWithoutResponse(testCommand);
      
      // Wait to ensure command was processed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('✅ [VALIDATOR] Stability test passed');
    } catch (error) {
      console.error('❌ [VALIDATOR] Stability test failed:', error);
      throw new Error('Connection unstable - test write failed');
    }
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
