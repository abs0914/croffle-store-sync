import { BleClient } from '@capacitor-community/bluetooth-le';
import { toast } from 'sonner';

// ESC/POS commands
const ESC = '\x1B';
const GS = '\x1D';

export const ESC_POS = {
  INIT: `${ESC}@`,
  ALIGN_CENTER: `${ESC}a1`,
  ALIGN_LEFT: `${ESC}a0`,
  ALIGN_RIGHT: `${ESC}a2`,
  BOLD_ON: `${ESC}E1`,
  BOLD_OFF: `${ESC}E0`,
  FONT_NORMAL: `${ESC}!0`,
  FONT_LARGE: `${ESC}!16`,
  FONT_MEDIUM: `${ESC}!8`,
  CUT_PAPER: `${GS}V66\x00`,
  LINE_FEED: '\n',
  SEPARATOR: '------------------------------------------------\n',
};

export interface ThermalReceiptData {
  receiptNumber: string;
  businessDate: string;
  transactionTime: string;
  storeName: string;
  storeAddress: string;
  storeTin: string;
  cashierName: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    itemDiscount?: number;
  }>;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  vatAmount: number;
  paymentMethod: string;
}

export class ThermalPrinterService {
  private deviceId: string | null = null;
  private serviceUuid: string = '000018f0-0000-1000-8000-00805f9b34fb'; // Common thermal printer service
  private characteristicUuid: string = '00002af1-0000-1000-8000-00805f9b34fb'; // Common write characteristic

  async connectToPrinter(): Promise<boolean> {
    try {
      await BleClient.initialize();
      
      const device = await BleClient.requestDevice({
        optionalServices: [this.serviceUuid]
      });

      this.deviceId = device.deviceId;
      await BleClient.connect(this.deviceId);
      
      toast.success('Connected to printer');
      return true;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      toast.error('Failed to connect to printer');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.deviceId) {
      try {
        await BleClient.disconnect(this.deviceId);
        this.deviceId = null;
        toast.success('Disconnected from printer');
      } catch (error) {
        console.error('Failed to disconnect:', error);
      }
    }
  }

  formatReceipt(data: ThermalReceiptData): string {
    let receipt = ESC_POS.INIT;

    // Header - Store Name
    receipt += ESC_POS.ALIGN_CENTER;
    receipt += ESC_POS.BOLD_ON;
    receipt += ESC_POS.FONT_LARGE;
    receipt += `${data.storeName}\n`;
    receipt += ESC_POS.FONT_NORMAL;
    receipt += ESC_POS.BOLD_OFF;
    
    // Store Address
    receipt += ESC_POS.ALIGN_CENTER;
    receipt += `${data.storeAddress}\n`;
    receipt += `TIN: ${data.storeTin}\n`;
    receipt += ESC_POS.LINE_FEED;
    
    // Receipt Details
    receipt += ESC_POS.ALIGN_LEFT;
    receipt += ESC_POS.SEPARATOR;
    receipt += `Receipt No: ${data.receiptNumber}\n`;
    receipt += `Date: ${data.businessDate}\n`;
    receipt += `Time: ${data.transactionTime}\n`;
    receipt += `Cashier: ${data.cashierName}\n`;
    receipt += ESC_POS.SEPARATOR;
    
    // Items
    receipt += ESC_POS.ALIGN_LEFT;
    data.items.forEach(item => {
      receipt += `${item.description}\n`;
      receipt += `  ${item.quantity} x ${this.formatCurrency(item.unitPrice)}`;
      receipt += this.padRight(this.formatCurrency(item.lineTotal), 48 - 10 - `  ${item.quantity} x ${this.formatCurrency(item.unitPrice)}`.length);
      receipt += '\n';
      
      if (item.itemDiscount && item.itemDiscount > 0) {
        receipt += `  Discount: -${this.formatCurrency(item.itemDiscount)}\n`;
      }
    });
    
    receipt += ESC_POS.SEPARATOR;
    
    // Totals
    receipt += ESC_POS.ALIGN_LEFT;
    receipt += this.formatTotalLine('GROSS AMOUNT:', data.grossAmount);
    
    if (data.discountAmount > 0) {
      receipt += this.formatTotalLine('DISCOUNT:', -data.discountAmount);
    }
    
    receipt += ESC_POS.SEPARATOR;
    receipt += ESC_POS.BOLD_ON;
    receipt += this.formatTotalLine('NET AMOUNT:', data.netAmount);
    receipt += ESC_POS.BOLD_OFF;
    
    receipt += this.formatTotalLine('VAT (12%):', data.vatAmount);
    receipt += ESC_POS.LINE_FEED;
    
    // Payment Method
    receipt += `Payment: ${data.paymentMethod}\n`;
    receipt += ESC_POS.SEPARATOR;
    
    // Footer
    receipt += ESC_POS.ALIGN_CENTER;
    receipt += 'Thank you for your business!\n';
    receipt += 'This serves as your Official Receipt\n';
    receipt += ESC_POS.LINE_FEED;
    receipt += ESC_POS.LINE_FEED;
    receipt += ESC_POS.LINE_FEED;
    
    // Cut paper
    receipt += ESC_POS.CUT_PAPER;
    
    return receipt;
  }

  private formatCurrency(amount: number): string {
    return `₱${Math.abs(amount).toFixed(2)}`;
  }

  private formatTotalLine(label: string, amount: number): string {
    const formattedAmount = this.formatCurrency(amount);
    const spaces = 48 - label.length - formattedAmount.length;
    return label + ' '.repeat(Math.max(1, spaces)) + formattedAmount + '\n';
  }

  private padRight(text: string, totalLength: number): string {
    const padding = totalLength - text.length;
    return padding > 0 ? ' '.repeat(padding) + text : text;
  }

  async printReceipt(data: ThermalReceiptData): Promise<boolean> {
    if (!this.deviceId) {
      const connected = await this.connectToPrinter();
      if (!connected) {
        return false;
      }
    }

    try {
      const receiptText = this.formatReceipt(data);
      const encoder = new TextEncoder();
      const data8 = encoder.encode(receiptText);

      // Send data in chunks (some printers have buffer limits)
      const chunkSize = 512;
      for (let i = 0; i < data8.length; i += chunkSize) {
        const chunk = data8.slice(i, Math.min(i + chunkSize, data8.length));
        const dataView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        await BleClient.write(
          this.deviceId!,
          this.serviceUuid,
          this.characteristicUuid,
          dataView
        );
        // Small delay between chunks to prevent buffer overflow
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      toast.success('Receipt printed successfully');
      return true;
    } catch (error) {
      console.error('Failed to print receipt:', error);
      toast.error('Failed to print receipt');
      return false;
    }
  }

  isConnected(): boolean {
    return this.deviceId !== null;
  }
}

// Singleton instance
export const thermalPrinter = new ThermalPrinterService();
