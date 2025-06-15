
import { BleClient, BleDevice } from '@capacitor-community/bluetooth-le';

export interface ThermalPrinter {
  id: string;
  name: string;
  isConnected: boolean;
  device?: BleDevice;
}

export class PrinterDiscovery {
  private static connectedPrinter: ThermalPrinter | null = null;
  
  static async initialize(): Promise<void> {
    try {
      await BleClient.initialize();
      console.log('Bluetooth initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Bluetooth:', error);
      throw new Error('Bluetooth not available on this device');
    }
  }
  
  static async scanForPrinters(): Promise<ThermalPrinter[]> {
    try {
      const devices = await BleClient.requestLEScan(
        {
          services: [], // Common thermal printer service UUIDs can be added here
          allowDuplicates: false
        },
        (result) => {
          console.log('Found device:', result);
        }
      );
      
      // Stop scanning after 10 seconds
      setTimeout(async () => {
        await BleClient.stopLEScan();
      }, 10000);
      
      // Filter for thermal printers (common names/patterns)
      const printers: ThermalPrinter[] = [];
      // This would be populated by the scan results
      // For now, return empty array as this is a demo implementation
      
      return printers;
    } catch (error) {
      console.error('Failed to scan for printers:', error);
      return [];
    }
  }
  
  static async connectToPrinter(printer: ThermalPrinter): Promise<boolean> {
    try {
      if (!printer.device) return false;
      
      await BleClient.connect(printer.device.deviceId);
      printer.isConnected = true;
      this.connectedPrinter = printer;
      
      console.log('Connected to printer:', printer.name);
      return true;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      return false;
    }
  }
  
  static async disconnectPrinter(): Promise<void> {
    if (this.connectedPrinter?.device) {
      try {
        await BleClient.disconnect(this.connectedPrinter.device.deviceId);
        this.connectedPrinter.isConnected = false;
        this.connectedPrinter = null;
      } catch (error) {
        console.error('Failed to disconnect printer:', error);
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
