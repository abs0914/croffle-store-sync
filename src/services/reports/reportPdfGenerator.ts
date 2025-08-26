import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface XReadingData {
  storeName: string;
  storeAddress: string;
  terminalId: string;
  shiftDate: string;
  shiftStart: string;
  shiftEnd: string;
  cashierName: string;
  grossSales: number;
  totalDiscounts: number;
  netSales: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  transactionCount: number;
  cashPayments: number;
  cardPayments: number;
  otherPayments: number;
  beginningReceiptNumber: string;
  endingReceiptNumber: string;
}

export interface ZReadingData extends XReadingData {
  runningTotal: number;
  previousGrandTotal: number;
  currentGrandTotal: number;
  resetCounter: number;
}

export class ReportPdfGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.pageWidth = 210;
    this.pageHeight = 297;
    this.margin = 20;
    this.currentY = 30;
  }

  generateXReading(data: XReadingData): string {
    this.addHeader('X-READING REPORT', data);
    this.addShiftDetails(data);
    this.addSalesBreakdown(data);
    this.addPaymentBreakdown(data);
    this.addReceiptRange(data);
    this.addFooter();
    
    return this.doc.output('datauristring');
  }

  generateZReading(data: ZReadingData): string {
    this.addHeader('Z-READING REPORT (END OF DAY)', data);
    this.addShiftDetails(data);
    this.addSalesBreakdown(data);
    this.addPaymentBreakdown(data);
    this.addReceiptRange(data);
    this.addGrandTotals(data);
    this.addFooter();
    
    return this.doc.output('datauristring');
  }

  private addHeader(title: string, data: XReadingData): void {
    // Title
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.addCenteredText(title, this.currentY);
    this.currentY += 10;
    
    // Store information
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.addCenteredText(data.storeName, this.currentY);
    this.currentY += 6;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.addCenteredText(data.storeAddress, this.currentY);
    this.currentY += 8;
    
    // Report details
    this.doc.setFontSize(10);
    this.addLeftText(`Terminal ID: ${data.terminalId}`, this.currentY);
    this.addRightText(`Date: ${format(new Date(data.shiftDate), 'MM/dd/yyyy')}`, this.currentY);
    this.currentY += 5;
    
    this.addLeftText(`Cashier: ${data.cashierName}`, this.currentY);
    this.addRightText(`Generated: ${format(new Date(), 'MM/dd/yyyy HH:mm:ss')}`, this.currentY);
    this.currentY += 10;
    
    this.addSeparator();
  }

  private addShiftDetails(data: XReadingData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.addLeftText('SHIFT DETAILS', this.currentY);
    this.currentY += 8;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    this.addLeftText(`Shift Start: ${data.shiftStart}`, this.currentY);
    this.currentY += 5;
    this.addLeftText(`Shift End: ${data.shiftEnd}`, this.currentY);
    this.currentY += 5;
    this.addLeftText(`Total Transactions: ${data.transactionCount}`, this.currentY);
    this.currentY += 10;
    
    this.addSeparator();
  }

  private addSalesBreakdown(data: XReadingData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.addLeftText('SALES BREAKDOWN', this.currentY);
    this.currentY += 8;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    this.addAmountLine('Gross Sales:', data.grossSales);
    this.addAmountLine('Total Discounts:', data.totalDiscounts);
    this.addSeparator(true);
    
    this.doc.setFont('helvetica', 'bold');
    this.addAmountLine('NET SALES:', data.netSales);
    this.doc.setFont('helvetica', 'normal');
    
    this.currentY += 5;
    this.addAmountLine('VATable Sales:', data.vatableSales);
    this.addAmountLine('VAT Amount (12%):', data.vatAmount);
    this.addAmountLine('VAT Exempt Sales:', data.vatExemptSales);
    this.addAmountLine('Zero Rated Sales:', data.zeroRatedSales);
    
    this.currentY += 5;
    this.addSeparator();
  }

  private addPaymentBreakdown(data: XReadingData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.addLeftText('PAYMENT BREAKDOWN', this.currentY);
    this.currentY += 8;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    this.addAmountLine('Cash Payments:', data.cashPayments);
    this.addAmountLine('Card Payments:', data.cardPayments);
    this.addAmountLine('Other Payments:', data.otherPayments);
    
    this.currentY += 5;
    this.addSeparator();
  }

  private addReceiptRange(data: XReadingData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.addLeftText('RECEIPT RANGE', this.currentY);
    this.currentY += 8;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    this.addLeftText(`Beginning Receipt: ${data.beginningReceiptNumber}`, this.currentY);
    this.currentY += 5;
    this.addLeftText(`Ending Receipt: ${data.endingReceiptNumber}`, this.currentY);
    this.currentY += 10;
    
    this.addSeparator();
  }

  private addGrandTotals(data: ZReadingData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.addLeftText('GRAND TOTALS', this.currentY);
    this.currentY += 8;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    this.addAmountLine('Previous Grand Total:', data.previousGrandTotal);
    this.addAmountLine('Current Period Sales:', data.netSales);
    this.addSeparator(true);
    
    this.doc.setFont('helvetica', 'bold');
    this.addAmountLine('CURRENT GRAND TOTAL:', data.currentGrandTotal);
    this.doc.setFont('helvetica', 'normal');
    
    this.currentY += 5;
    this.addLeftText(`Reset Counter: ${data.resetCounter}`, this.currentY);
    this.currentY += 10;
    
    this.addSeparator();
  }

  private addFooter(): void {
    this.currentY += 10;
    
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    this.addCenteredText('This report is system generated and requires no signature.', this.currentY);
    this.currentY += 4;
    this.addCenteredText('For BIR compliance and audit purposes only.', this.currentY);
    
    // Add page number if multiple pages
    const pageCount = this.doc.internal.pages.length - 1;
    if (pageCount > 1) {
      this.currentY += 10;
      this.addCenteredText(`Page 1 of ${pageCount}`, this.currentY);
    }
  }

  private addAmountLine(label: string, amount: number): void {
    this.addLeftText(label, this.currentY);
    this.addRightText(`₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, this.currentY);
    this.currentY += 5;
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

  private addSeparator(double: boolean = false): void {
    const y = this.currentY + 1;
    this.doc.line(this.margin, y, this.pageWidth - this.margin, y);
    if (double) {
      this.doc.line(this.margin, y + 1, this.pageWidth - this.margin, y + 1);
      this.currentY += 6;
    } else {
      this.currentY += 4;
    }
  }
}

// Helper functions to generate reports from data
export const generateXReadingPdf = (reportData: any): string => {
  const generator = new ReportPdfGenerator();
  
  const xReadingData: XReadingData = {
    storeName: reportData.storeName || 'SM Accredited Store',
    storeAddress: reportData.storeAddress || '123 Main Street, City, Province',
    terminalId: reportData.terminalId || 'TERMINAL-01',
    shiftDate: reportData.shiftDate || format(new Date(), 'yyyy-MM-dd'),
    shiftStart: reportData.shiftStart || '08:00:00',
    shiftEnd: reportData.shiftEnd || format(new Date(), 'HH:mm:ss'),
    cashierName: reportData.cashierName || 'System Generated',
    grossSales: reportData.grossSales || 0,
    totalDiscounts: reportData.totalDiscounts || 0,
    netSales: reportData.netSales || 0,
    vatableSales: reportData.vatableSales || 0,
    vatAmount: reportData.vatAmount || 0,
    vatExemptSales: reportData.vatExemptSales || 0,
    zeroRatedSales: reportData.zeroRatedSales || 0,
    transactionCount: reportData.transactionCount || 0,
    cashPayments: reportData.cashPayments || 0,
    cardPayments: reportData.cardPayments || 0,
    otherPayments: reportData.otherPayments || 0,
    beginningReceiptNumber: reportData.beginningReceiptNumber || '000001',
    endingReceiptNumber: reportData.endingReceiptNumber || '000001'
  };
  
  return generator.generateXReading(xReadingData);
};

export const generateZReadingPdf = (reportData: any): string => {
  const generator = new ReportPdfGenerator();
  
  const zReadingData: ZReadingData = {
    storeName: reportData.storeName || 'SM Accredited Store',
    storeAddress: reportData.storeAddress || '123 Main Street, City, Province',
    terminalId: reportData.terminalId || 'TERMINAL-01',
    shiftDate: reportData.shiftDate || format(new Date(), 'yyyy-MM-dd'),
    shiftStart: reportData.shiftStart || '08:00:00',
    shiftEnd: reportData.shiftEnd || format(new Date(), 'HH:mm:ss'),
    cashierName: reportData.cashierName || 'System Generated',
    grossSales: reportData.grossSales || 0,
    totalDiscounts: reportData.totalDiscounts || 0,
    netSales: reportData.netSales || 0,
    vatableSales: reportData.vatableSales || 0,
    vatAmount: reportData.vatAmount || 0,
    vatExemptSales: reportData.vatExemptSales || 0,
    zeroRatedSales: reportData.zeroRatedSales || 0,
    transactionCount: reportData.transactionCount || 0,
    cashPayments: reportData.cashPayments || 0,
    cardPayments: reportData.cardPayments || 0,
    otherPayments: reportData.otherPayments || 0,
    beginningReceiptNumber: reportData.beginningReceiptNumber || '000001',
    endingReceiptNumber: reportData.endingReceiptNumber || '000001',
    runningTotal: reportData.runningTotal || 0,
    previousGrandTotal: reportData.previousGrandTotal || 0,
    currentGrandTotal: reportData.currentGrandTotal || 0,
    resetCounter: reportData.resetCounter || 1
  };
  
  return generator.generateZReading(zReadingData);
};