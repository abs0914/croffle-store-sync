import { BleDevice } from '@capacitor-community/bluetooth-le';

export type PrinterType = 'thermal' | 'dot-matrix' | 'unknown';

export interface BluetoothPrinter {
  id: string;
  name: string;
  isConnected: boolean;
  device?: BleDevice;
  webBluetoothDevice?: BluetoothDevice;
  connectionType?: 'web' | 'capacitor';
  printerType?: PrinterType;
  capabilities?: PrinterCapabilities;
}

export interface PrinterCapabilities {
  supportsCutting: boolean;
  supportsQRCodes: boolean;
  supportsCashDrawer: boolean;
  maxLineWidth: number;
  supportedFonts: string[];
  supportsGraphics: boolean;
}

export const DEFAULT_THERMAL_CAPABILITIES: PrinterCapabilities = {
  supportsCutting: true,
  supportsQRCodes: true,
  supportsCashDrawer: true,
  maxLineWidth: 32,
  supportedFonts: ['normal', 'small', 'double-width', 'double-height'],
  supportsGraphics: true,
};

export const DEFAULT_DOT_MATRIX_CAPABILITIES: PrinterCapabilities = {
  supportsCutting: false,
  supportsQRCodes: false,
  supportsCashDrawer: false,
  maxLineWidth: 80,
  supportedFonts: ['normal', 'condensed', 'expanded'],
  supportsGraphics: false,
};

// Legacy alias for backward compatibility
export type ThermalPrinter = BluetoothPrinter;