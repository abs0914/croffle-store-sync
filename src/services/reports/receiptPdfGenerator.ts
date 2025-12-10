import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface ReceiptData {
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
    itemDiscount: number;
    vatExemptFlag: boolean;
  }>;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  vatAmount: number;
  paymentMethod: string;
  discountType?: string;
  seniorDiscount?: number;
  pwdDiscount?: number;
  promoDetails?: string;
}

export class ReceiptPdfGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private margin: number;
  private currentY: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // Typical receipt size
    });
    this.pageWidth = 80;
    this.margin = 5;
    this.currentY = 10;
  }

  generateReceipt(receipt: ReceiptData): string {
    this.addHeader(receipt);
    this.addItems(receipt.items);
    this.addTotals(receipt);
    this.addFooter(receipt);
    
    return this.doc.output('datauristring');
  }

  generateBatchReceipts(receipts: ReceiptData[]): string {
    receipts.forEach((receipt, index) => {
      if (index > 0) {
        this.doc.addPage();
        this.currentY = 10;
      }
      
      this.addHeader(receipt);
      this.addItems(receipt.items);
      this.addTotals(receipt);
      this.addFooter(receipt);
    });
    
    return this.doc.output('datauristring');
  }

  private addHeader(receipt: ReceiptData): void {
    // Store name
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.addCenteredText(receipt.storeName, this.currentY);
    this.currentY += 5;
    
    // Store address
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.addCenteredText(receipt.storeAddress, this.currentY);
    this.currentY += 4;
    
    // TIN
    this.addCenteredText(`TIN: ${receipt.storeTin}`, this.currentY);
    this.currentY += 5;
    
    // SALES INVOICE title
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.addCenteredText('SALES INVOICE', this.currentY);
    this.currentY += 5;
    
    // Receipt details
    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'normal');
    this.addLeftText(`SI No: ${receipt.receiptNumber}`, this.currentY);
    this.currentY += 3;
    this.addLeftText(`Date: ${format(new Date(receipt.businessDate), 'MM/dd/yyyy')}`, this.currentY);
    this.currentY += 3;
    this.addLeftText(`Time: ${receipt.transactionTime}`, this.currentY);
    this.currentY += 3;
    this.addLeftText(`Cashier: ${receipt.cashierName}`, this.currentY);
    this.currentY += 5;
    
    // Separator line
    this.addSeparator();
  }

  private addItems(items: ReceiptData['items']): void {
    this.doc.setFontSize(7);
    
    items.forEach(item => {
      // Item description
      this.addLeftText(item.description, this.currentY);
      this.currentY += 3;
      
      // Quantity, price, total - use P instead of ₱ for PDF compatibility
      const line = `${item.quantity} x P${item.unitPrice.toFixed(2)} = P${item.lineTotal.toFixed(2)}`;
      this.addLeftText(line, this.currentY);
      
      if (item.itemDiscount > 0) {
        this.addRightText(`-P${item.itemDiscount.toFixed(2)}`, this.currentY);
      }
      
      this.currentY += 3;
      
      if (item.vatExemptFlag) {
        this.addLeftText('  VAT EXEMPT', this.currentY);
        this.currentY += 3;
      }
      
      this.currentY += 1;
    });
    
    this.addSeparator();
  }

  private addTotals(receipt: ReceiptData): void {
    this.doc.setFontSize(8);
    
    // Gross amount
    this.addTotalLine('GROSS AMOUNT:', receipt.grossAmount);
    
    // Discounts
    if (receipt.discountAmount > 0) {
      this.addTotalLine('DISCOUNT:', -receipt.discountAmount);
    }
    
    if (receipt.seniorDiscount && receipt.seniorDiscount > 0) {
      this.addTotalLine('SENIOR DISCOUNT:', -receipt.seniorDiscount);
    }
    
    if (receipt.pwdDiscount && receipt.pwdDiscount > 0) {
      this.addTotalLine('PWD DISCOUNT:', -receipt.pwdDiscount);
    }
    
    // Net amount
    this.addSeparator();
    this.doc.setFont('helvetica', 'bold');
    this.addTotalLine('NET AMOUNT:', receipt.netAmount);
    
    // VAT
    this.doc.setFont('helvetica', 'normal');
    this.addTotalLine('VAT (12%):', receipt.vatAmount);
    
    this.currentY += 3;
    
    // Payment method
    this.addLeftText(`Payment: ${receipt.paymentMethod}`, this.currentY);
    this.currentY += 5;
    
    // Promo details if any
    if (receipt.promoDetails) {
      this.doc.setFontSize(6);
      this.addLeftText('Promos Applied:', this.currentY);
      this.currentY += 2;
      this.addLeftText(receipt.promoDetails, this.currentY);
      this.currentY += 4;
    }
  }

  private addFooter(receipt: ReceiptData): void {
    this.doc.setFontSize(6);
    this.doc.setFont('helvetica', 'normal');
    
    this.addSeparator();
    this.addCenteredText('Thank you for your business!', this.currentY);
    this.currentY += 4;
    this.addCenteredText('THIS IS NOT AN OFFICIAL RECEIPT', this.currentY);
    this.currentY += 3;
    this.addCenteredText(`Generated: ${format(new Date(), 'MM/dd/yyyy HH:mm:ss')}`, this.currentY);
    
    // QR Code placeholder (could be enhanced with actual QR code generation)
    this.currentY += 5;
    this.addCenteredText('[QR CODE PLACEHOLDER]', this.currentY);
  }

  private addTotalLine(label: string, amount: number): void {
    this.addLeftText(label, this.currentY);
    // Use P instead of ₱ for PDF font compatibility
    this.addRightText(`P${Math.abs(amount).toFixed(2)}`, this.currentY);
    this.currentY += 3;
  }

  private addLeftText(text: string, y: number): void {
    this.doc.text(text, this.margin, y);
  }

  private addRightText(text: string, y: number): void {
    const textWidth = this.doc.getTextWidth(text);
    this.doc.text(text, this.pageWidth - this.margin - textWidth, y);
  }

  private addCenteredText(text: string, y: number): void {
    const textWidth = this.doc.getTextWidth(text);
    const x = (this.pageWidth - textWidth) / 2;
    this.doc.text(text, x, y);
  }

  private addSeparator(): void {
    const y = this.currentY + 1;
    this.doc.line(this.margin, y, this.pageWidth - this.margin, y);
    this.currentY += 4;
  }
}

export const generateVirtualReceipts = (transactions: any[]): string => {
  const generator = new ReceiptPdfGenerator();
  
  const receipts: ReceiptData[] = transactions.map(transaction => ({
    receiptNumber: transaction.receipt_number,
    businessDate: transaction.business_date,
    transactionTime: transaction.transaction_time || '00:00:00',
    storeName: 'SM Accredited Store',
    storeAddress: '123 Main Street, City, Province',
    storeTin: '123-456-789-000',
    cashierName: transaction.cashier_name || 'Cashier',
    items: transaction.details || [],
    grossAmount: parseFloat(transaction.gross_amount) || 0,
    discountAmount: parseFloat(transaction.discount_amount) || 0,
    netAmount: parseFloat(transaction.net_amount) || 0,
    vatAmount: parseFloat(transaction.vat_amount) || 0,
    paymentMethod: transaction.payment_method || 'Cash',
    discountType: transaction.discount_type,
    seniorDiscount: parseFloat(transaction.senior_discount) || 0,
    pwdDiscount: parseFloat(transaction.pwd_discount) || 0,
    promoDetails: transaction.promo_details
  }));
  
  return generator.generateBatchReceipts(receipts);
};