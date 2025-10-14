import { BleClient } from '@capacitor-community/bluetooth-le';
import { PrinterDiscovery, BluetoothPrinter } from './PrinterDiscovery';
import { toast } from 'sonner';

export enum ConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  RECONNECT_FAILED = 'reconnect_failed'
}

export interface ReconnectionConfig {
  enableAutoReconnect: boolean;
  reconnectionTimeout: number;
  showReconnectionNotifications: boolean;
}

type ConnectionStateCallback = (state: ConnectionState, printer: BluetoothPrinter | null) => void;

export class BluetoothReconnectionService {
  private static isReconnecting: boolean = false;
  private static currentState: ConnectionState = ConnectionState.DISCONNECTED;
  private static stateCallbacks: Set<ConnectionStateCallback> = new Set();
  private static config: ReconnectionConfig = {
    enableAutoReconnect: true,
    reconnectionTimeout: 3000,
    showReconnectionNotifications: true
  };

  static initialize(): void {
    console.log('🔄 Initializing Bluetooth Reconnection Service...');
    this.loadConfig();
  }

  static setConfig(config: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }

  static getConfig(): ReconnectionConfig {
    return { ...this.config };
  }

  private static loadConfig(): void {
    try {
      const saved = localStorage.getItem('bluetooth_reconnection_config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load reconnection config:', error);
    }
  }

  private static saveConfig(): void {
    try {
      localStorage.setItem('bluetooth_reconnection_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save reconnection config:', error);
    }
  }

  static subscribeToStateChanges(callback: ConnectionStateCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  private static notifyStateChange(state: ConnectionState, printer: BluetoothPrinter | null): void {
    this.currentState = state;
    this.stateCallbacks.forEach(callback => {
      try {
        callback(state, printer);
      } catch (error) {
        console.error('State callback error:', error);
      }
    });
  }

  static getCurrentState(): ConnectionState {
    return this.currentState;
  }

  static async handleDisconnection(printer: BluetoothPrinter): Promise<void> {
    console.log('⚠️ Printer disconnected:', printer.name);
    this.notifyStateChange(ConnectionState.DISCONNECTED, printer);

    if (this.config.showReconnectionNotifications) {
      toast.warning('Printer disconnected', {
        description: `${printer.name} has been disconnected`
      });
    }

    if (this.config.enableAutoReconnect) {
      await this.attemptReconnection(printer);
    }
  }

  static async attemptReconnection(printer: BluetoothPrinter): Promise<boolean> {
    // Prevent concurrent reconnection attempts
    if (this.isReconnecting) {
      console.log('⏸️ Reconnection already in progress, skipping...');
      return false;
    }

    this.isReconnecting = true;
    this.notifyStateChange(ConnectionState.RECONNECTING, printer);

    if (this.config.showReconnectionNotifications) {
      toast.info('Reconnecting...', {
        description: `Attempting to reconnect to ${printer.name}`
      });
    }

    console.log(`🔄 Attempting 1-step reconnection to ${printer.name}...`);

    try {
      const success = await this.performReconnection(printer);

      if (success) {
        console.log('✅ Reconnection successful');
        this.notifyStateChange(ConnectionState.CONNECTED, printer);
        
        if (this.config.showReconnectionNotifications) {
          toast.success('Reconnected', {
            description: `Successfully reconnected to ${printer.name}`
          });
        }
        
        return true;
      } else {
        console.log('❌ Reconnection failed');
        this.notifyStateChange(ConnectionState.RECONNECT_FAILED, printer);
        
        if (this.config.showReconnectionNotifications) {
          toast.error('Reconnection failed', {
            description: 'Please reconnect manually',
            action: {
              label: 'Reconnect',
              onClick: () => this.manualReconnect(printer)
            }
          });
        }
        
        return false;
      }
    } catch (error) {
      console.error('Reconnection error:', error);
      this.notifyStateChange(ConnectionState.RECONNECT_FAILED, printer);
      
      if (this.config.showReconnectionNotifications) {
        toast.error('Reconnection error', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      return false;
    } finally {
      this.isReconnecting = false;
    }
  }

  private static async performReconnection(printer: BluetoothPrinter): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⏱️ Reconnection timeout');
        resolve(false);
      }, this.config.reconnectionTimeout);

      (async () => {
        try {
          let success = false;

          if (printer.connectionType === 'web' && printer.webBluetoothDevice) {
            success = await this.reconnectWebBluetooth(printer);
          } else if (printer.connectionType === 'capacitor' && printer.device) {
            success = await this.reconnectCapacitorBLE(printer);
          }

          clearTimeout(timeout);
          resolve(success);
        } catch (error) {
          clearTimeout(timeout);
          console.error('Reconnection attempt failed:', error);
          resolve(false);
        }
      })();
    });
  }

  private static async reconnectWebBluetooth(printer: BluetoothPrinter): Promise<boolean> {
    try {
      if (!printer.webBluetoothDevice?.gatt) {
        return false;
      }

      if (printer.webBluetoothDevice.gatt.connected) {
        console.log('✓ Web Bluetooth already connected');
        return true;
      }

      await printer.webBluetoothDevice.gatt.connect();
      printer.isConnected = true;
      return true;
    } catch (error) {
      console.error('Web Bluetooth reconnection failed:', error);
      return false;
    }
  }

  private static async reconnectCapacitorBLE(printer: BluetoothPrinter): Promise<boolean> {
    try {
      if (!printer.device) {
        return false;
      }

      await BleClient.connect(printer.device.deviceId, () => {
        console.log('📱 Capacitor BLE disconnected - triggering reconnection handler');
        this.handleDisconnection(printer);
      });
      
      printer.isConnected = true;
      return true;
    } catch (error) {
      console.error('Capacitor BLE reconnection failed:', error);
      return false;
    }
  }

  static async manualReconnect(printer: BluetoothPrinter): Promise<boolean> {
    console.log('🔧 Manual reconnection triggered');
    return await this.attemptReconnection(printer);
  }

  static setupDisconnectionListeners(printer: BluetoothPrinter): void {
    if (printer.connectionType === 'web' && printer.webBluetoothDevice) {
      printer.webBluetoothDevice.addEventListener('gattserverdisconnected', () => {
        console.log('🔌 Web Bluetooth GATT disconnected event');
        this.handleDisconnection(printer);
      });
      console.log('✓ Web Bluetooth disconnection listener registered');
    } else if (printer.connectionType === 'capacitor' && printer.device) {
      // Capacitor BLE disconnect listener is set up in the connect call
      console.log('✓ Capacitor BLE disconnection listener ready');
    }
  }

  static reset(): void {
    this.isReconnecting = false;
    this.currentState = ConnectionState.DISCONNECTED;
    this.stateCallbacks.clear();
  }
}
