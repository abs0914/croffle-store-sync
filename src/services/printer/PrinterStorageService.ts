// Service for persisting last connected printer info to localStorage

export interface StoredPrinterInfo {
  id: string;
  name: string;
  printerType?: 'thermal' | 'dot-matrix' | 'unknown';
  lastConnected: string; // ISO timestamp
}

const STORAGE_KEY = 'lastConnectedPrinter';

export class PrinterStorageService {
  static saveLastPrinter(printer: { id: string; name: string; printerType?: string }): void {
    try {
      const storedInfo: StoredPrinterInfo = {
        id: printer.id,
        name: printer.name,
        printerType: printer.printerType as StoredPrinterInfo['printerType'],
        lastConnected: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedInfo));
      console.log('💾 Saved last printer:', storedInfo.name);
    } catch (error) {
      console.error('Failed to save printer to localStorage:', error);
    }
  }

  static getLastPrinter(): StoredPrinterInfo | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as StoredPrinterInfo;
    } catch (error) {
      console.error('Failed to get printer from localStorage:', error);
      return null;
    }
  }

  static clearLastPrinter(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Cleared last printer from storage');
    } catch (error) {
      console.error('Failed to clear printer from localStorage:', error);
    }
  }

  static hasStoredPrinter(): boolean {
    return this.getLastPrinter() !== null;
  }

  static getLastConnectedTimeAgo(): string | null {
    const printer = this.getLastPrinter();
    if (!printer) return null;

    const lastConnected = new Date(printer.lastConnected);
    const now = new Date();
    const diffMs = now.getTime() - lastConnected.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
}
