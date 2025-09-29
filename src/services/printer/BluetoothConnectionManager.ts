/**
 * Bluetooth Connection Manager
 * Provides utilities for managing persistent Bluetooth printer connections
 */

import { PrinterDiscovery } from './PrinterDiscovery';
import { toast } from 'sonner';

export class BluetoothConnectionManager {
  private static reconnectionAttempts: number = 0;
  private static maxReconnectionAttempts: number = 3;

  /**
   * Force a connection health check and attempt reconnection if needed
   */
  static async checkAndRestoreConnection(): Promise<boolean> {
    const connectedPrinter = PrinterDiscovery.getConnectedPrinter();
    
    if (!connectedPrinter) {
      console.log('No printer connected to check');
      return false;
    }

    try {
      console.log('🔍 Checking printer connection health...');
      
      // Check current connection status
      const isConnected = PrinterDiscovery.isConnected();
      
      if (!isConnected) {
        console.log('⚠️ Printer connection lost - attempting restoration...');
        
        // Attempt reconnection
        const restored = await this.forceReconnection();
        
        if (restored) {
          this.reconnectionAttempts = 0; // Reset counter on success
          toast.success('Printer connection restored', {
            description: 'Bluetooth connection has been re-established'
          });
          return true;
        } else {
          toast.error('Failed to restore printer connection', {
            description: 'Please check your printer and try reconnecting manually'
          });
          return false;
        }
      } else {
        console.log('✅ Printer connection is healthy');
        this.reconnectionAttempts = 0; // Reset counter
        return true;
      }
    } catch (error) {
      console.error('Connection health check failed:', error);
      return false;
    }
  }

  /**
   * Force reconnection to the current printer
   */
  static async forceReconnection(): Promise<boolean> {
    const connectedPrinter = PrinterDiscovery.getConnectedPrinter();
    
    if (!connectedPrinter) {
      return false;
    }

    if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      console.log(`❌ Maximum reconnection attempts (${this.maxReconnectionAttempts}) reached`);
      return false;
    }

    try {
      this.reconnectionAttempts++;
      console.log(`🔄 Force reconnection attempt ${this.reconnectionAttempts}/${this.maxReconnectionAttempts}...`);

      // Attempt to reconnect
      const success = await PrinterDiscovery.connectToPrinter(connectedPrinter);
      
      if (success) {
        console.log('✅ Force reconnection successful');
        return true;
      } else {
        console.log(`❌ Force reconnection attempt ${this.reconnectionAttempts} failed`);
        
        if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, 2000));
          return await this.forceReconnection();
        }
        
        return false;
      }
    } catch (error) {
      console.error(`❌ Force reconnection attempt ${this.reconnectionAttempts} failed:`, error);
      
      if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.forceReconnection();
      }
      
      return false;
    }
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