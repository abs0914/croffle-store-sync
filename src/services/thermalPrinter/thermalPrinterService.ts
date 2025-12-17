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
    
    // Store Address and TIN
    receipt += ESC_POS.ALIGN_CENTER;
    receipt += `${data.storeAddress}\n`;
    receipt += `VAT REG. TIN: ${data.storeTin}\n`;
    receipt += ESC_POS.LINE_FEED;
    
    // SALES INVOICE Header
    receipt += ESC_POS.BOLD_ON;
    receipt += 'SALES INVOICE\n';
    receipt += ESC_POS.BOLD_OFF;
    
    // Receipt Details - SI No instead of Receipt No
    receipt += ESC_POS.ALIGN_LEFT;
    receipt += ESC_POS.SEPARATOR;
    receipt += `SI No: ${data.receiptNumber}\n`;
    receipt += `Date: ${data.businessDate}\n`;
    receipt += `Time: ${data.transactionTime}\n`;
    receipt += `Cashier: ${data.cashierName}\n`;
    receipt += ESC_POS.SEPARATOR;
    
    // Item Header (BIR format)
    receipt += ESC_POS.ALIGN_LEFT;
    receipt += 'DESC           QTY PRICE   AMOUNT\n';
    receipt += ESC_POS.SEPARATOR;
    
    // Items (BIR format: qty * price amount)
    data.items.forEach(item => {
      receipt += `${item.description}\n`;
      receipt += `${item.quantity} * ${this.formatCurrency(item.unitPrice)}`;
      const spacing = 48 - `${item.quantity} * ${this.formatCurrency(item.unitPrice)}`.length - this.formatCurrency(item.lineTotal).length;
      receipt += ' '.repeat(Math.max(1, spacing));
      receipt += `${this.formatCurrency(item.lineTotal)}\n`;
      
      if (item.itemDiscount && item.itemDiscount > 0) {
        receipt += `  Discount: -${this.formatCurrency(item.itemDiscount)}\n`;
      }
    });
    
    receipt += ESC_POS.SEPARATOR;
    
    // BIR Totals Format: Total Sales → Less VAT → Net of VAT → Discount → Add VAT → Total
    const grossAmount = data.grossAmount;
    const vatAmount = data.vatAmount || (grossAmount / 1.12 * 0.12);
    const netOfVat = grossAmount - vatAmount;
    
    receipt += ESC_POS.ALIGN_LEFT;
    receipt += this.formatTotalLine('Total Sales:', grossAmount);
    receipt += this.formatTotalLine('Less 12% VAT:', vatAmount);
    receipt += this.formatTotalLine('Amt. Net of VAT:', netOfVat);
    
    // Discount with type
    if (data.discountAmount > 0) {
      const transaction = (data as any).transaction;
      const discountType = transaction?.discountType || 'regular';
      let discountLabel = 'DISCOUNT';
      let discountPercent = '';
      
      switch (discountType) {
        case 'senior': discountLabel = 'SENIOR CITIZEN'; discountPercent = '20%'; break;
        case 'pwd': discountLabel = 'PWD'; discountPercent = '20%'; break;
        case 'naac': 
        case 'athletes_coaches': discountLabel = 'NAAC'; discountPercent = '20%'; break;
        case 'solo_parent': discountLabel = 'SOLO PARENT'; discountPercent = '20%'; break;
        case 'employee': discountLabel = 'EMPLOYEE'; discountPercent = '15%'; break;
        case 'loyalty': discountLabel = 'LOYALTY'; discountPercent = '10%'; break;
        case 'regular': discountLabel = 'REGULAR'; discountPercent = '5%'; break;
        case 'custom': discountLabel = 'CUSTOM'; break;
        case 'complimentary': discountLabel = 'COMPLIMENTARY'; discountPercent = '100%'; break;
      }
      
      const fullLabel = discountPercent ? `${discountLabel} ${discountPercent}:` : `${discountLabel}:`;
      receipt += this.formatTotalLine(fullLabel, -data.discountAmount);
      
      // Beneficiary info for VAT-exempt discounts
      if (['senior', 'pwd', 'naac', 'athletes_coaches', 'solo_parent'].includes(discountType)) {
        if (transaction?.discountIdNumber) {
          let idType = 'ID No.';
          switch (discountType) {
            case 'senior': idType = 'OSCA ID No.'; break;
            case 'pwd': idType = 'PWD ID No.'; break;
            case 'naac': 
            case 'athletes_coaches': idType = 'NAAC ID No.'; break;
            case 'solo_parent': idType = 'Solo Parent ID No.'; break;
          }
          receipt += `${idType}: ${transaction.discountIdNumber}\n`;
        }
      }
    }
    
    // Add VAT (for non-exempt)
    const isVatExempt = ['senior', 'pwd', 'naac', 'athletes_coaches', 'solo_parent'].includes((data as any).transaction?.discountType);
    if (!isVatExempt || data.discountAmount === 0) {
      receipt += this.formatTotalLine('Add VAT:', vatAmount);
    }
    
    receipt += ESC_POS.SEPARATOR;
    receipt += ESC_POS.BOLD_ON;
    receipt += this.formatTotalLine('TOTAL AMOUNT DUE:', data.netAmount);
    receipt += ESC_POS.BOLD_OFF;
    receipt += ESC_POS.SEPARATOR;
    
    // VAT Breakdown Section
    const vatableSales = isVatExempt && data.discountAmount > 0 ? 0 : netOfVat;
    const vatExemptSales = isVatExempt && data.discountAmount > 0 ? netOfVat : 0;
    
    receipt += this.formatTotalLine('VATABLE Sales:', vatableSales);
    receipt += this.formatTotalLine('VAT 12%:', isVatExempt ? 0 : vatAmount);
    receipt += this.formatTotalLine('VAT Exempt Sales:', vatExemptSales);
    receipt += this.formatTotalLine('Zero-Rated Sales:', 0);
    receipt += ESC_POS.SEPARATOR;
    
    // Payment Section
    receipt += `Payment Type: ${data.paymentMethod}\n`;
    
    // Credit card details if applicable
    const transaction = (data as any).transaction;
    const paymentDetails = transaction?.paymentDetails || transaction?.payment_details;
    if (data.paymentMethod === 'CARD' || data.paymentMethod === 'CREDIT' || data.paymentMethod === 'DEBIT') {
      const cardType = paymentDetails?.cardType || paymentDetails?.card_type || 'Credit Card';
      const cardNumber = paymentDetails?.cardNumber || paymentDetails?.card_number || paymentDetails?.lastFourDigits || '';
      const maskedNumber = cardNumber ? '**** **** **** ' + cardNumber.slice(-4) : 'N/A';
      receipt += `Credit Card Type: ${cardType}\n`;
      receipt += `Credit Card No.: ${maskedNumber}\n`;
      if (paymentDetails?.approvalCode || paymentDetails?.approval_code) {
        receipt += `Approval Code: ${paymentDetails.approvalCode || paymentDetails.approval_code}\n`;
      }
    }
    
    receipt += ESC_POS.SEPARATOR;
    
    // Signature line for discount transactions
    if (data.discountAmount > 0 && isVatExempt) {
      receipt += '\n';
      receipt += '________________________\n';
      receipt += ESC_POS.ALIGN_CENTER;
      receipt += "(Customer's Signature)\n";
      receipt += ESC_POS.ALIGN_LEFT;
      receipt += ESC_POS.SEPARATOR;
    }
    
    // Footer
    receipt += ESC_POS.ALIGN_CENTER;
    receipt += ESC_POS.BOLD_ON;
    receipt += 'THIS SERVES AS YOUR INVOICE\n';
    receipt += ESC_POS.BOLD_OFF;
    receipt += '\nThank you for dining with us!\n';
    receipt += ESC_POS.LINE_FEED;
    receipt += ESC_POS.LINE_FEED;
    receipt += ESC_POS.LINE_FEED;
    
    // Cut paper
    receipt += ESC_POS.CUT_PAPER;
    
    return receipt;
  }

  private formatCurrency(amount: number): string {
    return `P${Math.abs(amount).toFixed(2)}`; // Use 'P' instead of peso symbol for thermal printer compatibility
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
