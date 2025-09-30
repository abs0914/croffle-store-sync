/**
 * Bluetooth Connection Manager
 * Provides utilities for managing persistent Bluetooth printer connections
 */

import { PrinterDiscovery } from './PrinterDiscovery';
import { BluetoothReconnectionService } from './BluetoothReconnectionService';
import { toast } from 'sonner';

export class BluetoothConnectionManager {
  private static reconnectionAttempts: number = 0;
  private static maxReconnectionAttempts: number = 1; // Simplified to single attempt

  /**
   * Manual health check - used for user-triggered reconnection
   */
  static async checkAndRestoreConnection(): Promise<boolean> {
    const connectedPrinter = PrinterDiscovery.getConnectedPrinter();
    
    if (!connectedPrinter) {
      console.log('No printer connected to check');
      return false;
    }

    // Check if connection is healthy
    if (PrinterDiscovery.isConnected()) {
      console.log('✅ Printer connection is healthy');
      return true;
    }

    console.log('🔧 Manual connection restore requested...');
    
    // Use the reconnection service for manual attempts
    return await BluetoothReconnectionService.manualReconnect(connectedPrinter);
  }

  /**
   * Force reconnection - for user-triggered manual reconnection
   */
  static async forceReconnection(): Promise<boolean> {
    const connectedPrinter = PrinterDiscovery.getConnectedPrinter();
    
    if (!connectedPrinter) {
      console.log('No printer to reconnect');
      return false;
    }

    console.log('🔄 Force reconnection requested...');
    
    // Disconnect first
    await PrinterDiscovery.disconnectPrinter();
    
    // Brief delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Use the reconnection service for manual attempts
    return await BluetoothReconnectionService.manualReconnect(connectedPrinter);
  }

  /**
   * Reset reconnection attempt counter
   */
  static resetReconnectionAttempts(): void {
    this.reconnectionAttempts = 0;
    console.log('🔄 Reconnection attempts counter reset');
  }

  /**
   * Get current reconnection status
   */
  static getReconnectionStatus(): { attempts: number; maxAttempts: number; canRetry: boolean } {
    return {
      attempts: this.reconnectionAttempts,
      maxAttempts: this.maxReconnectionAttempts,
      canRetry: this.reconnectionAttempts < this.maxReconnectionAttempts
    };
  }

  /**
   * Manually trigger connection maintenance
   */
  static async maintainConnection(): Promise<void> {
    const connectedPrinter = PrinterDiscovery.getConnectedPrinter();
    
    if (!connectedPrinter?.isConnected) {
      return;
    }

    try {
      console.log('🔧 Performing manual connection maintenance...');
      
      if (connectedPrinter.connectionType === 'web' && connectedPrinter.webBluetoothDevice) {
        // Check Web Bluetooth connection
        const isGattConnected = connectedPrinter.webBluetoothDevice.gatt?.connected;
        
        if (!isGattConnected) {
          console.log('⚠️ GATT server disconnected - attempting reconnection...');
          await connectedPrinter.webBluetoothDevice.gatt?.connect();
          console.log('✅ GATT server reconnected');
        } else {
          console.log('✅ Web Bluetooth GATT connection active');
        }
      } else {
        console.log('✅ Bluetooth connection maintenance completed');
      }
      
    } catch (error) {
      console.warn('⚠️ Connection maintenance encountered an issue:', error);
    }
  }
}