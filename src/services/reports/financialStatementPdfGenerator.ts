import jsPDF from 'jspdf';

export interface FinancialStatementData {
  statementType: 'income' | 'balance' | 'cashflow';
  storeName: string;
  period: string;
  data: any;
}

export class FinancialStatementPdfGenerator {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageWidth: number;
  private pageHeight: number;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  generateStatement(statementData: FinancialStatementData): string {
    this.resetPosition();
    
    // Add header
    this.addHeader(statementData);
    
    // Add content based on statement type
    switch (statementData.statementType) {
      case 'income':
        this.addIncomeStatement();
        break;
      case 'balance':
        this.addBalanceSheet();
        break;
      case 'cashflow':
        this.addCashFlowStatement();
        break;
    }
    
    return this.doc.output('datauristring');
  }

  private resetPosition(): void {
    this.currentY = 20;
  }

  private addHeader(statementData: FinancialStatementData): void {
    // Company name
    this.doc.setFontSize(16);
    this.doc.setFont(undefined, 'bold');
    this.addCenteredText('Croffle Management System');
    this.currentY += 8;
    
    // Store name if not all stores
    if (statementData.storeName !== 'All Stores (Consolidated)') {
      this.doc.setFontSize(12);
      this.addCenteredText(statementData.storeName);
      this.currentY += 6;
    }
    
    // Statement title
    this.doc.setFontSize(14);
    const titles = {
      income: 'Income Statement',
      balance: 'Balance Sheet',
      cashflow: 'Cash Flow Statement'
    };
    this.addCenteredText(titles[statementData.statementType]);
    this.currentY += 6;
    
    // Period
    this.doc.setFontSize(10);
    this.doc.setFont(undefined, 'normal');
    const periodText = statementData.statementType === 'balance' 
      ? `As of ${statementData.period}` 
      : `For the Period Ended ${statementData.period}`;
    this.addCenteredText(periodText);
    this.currentY += 15;
  }

  private addIncomeStatement(): void {
    // Revenue Section
    this.addSectionHeader('REVENUE');
    this.addLineItem('Sales Revenue', '₱185,000.00');
    this.addLineItem('Other Revenue', '₱5,200.00');
    this.addTotalLine('Total Revenue', '₱190,200.00');
    this.currentY += 5;

    // Cost of Goods Sold
    this.addSectionHeader('COST OF GOODS SOLD');
    this.addLineItem('Raw Materials', '₱65,400.00');
    this.addLineItem('Direct Labor', '₱28,500.00');
    this.addTotalLine('Total COGS', '₱93,900.00');
    this.currentY += 5;

    // Gross Profit
    this.addHighlightedTotal('GROSS PROFIT', '₱96,300.00', 'Margin: 50.6%');
    this.currentY += 8;

    // Operating Expenses
    this.addSectionHeader('OPERATING EXPENSES');
    this.addLineItem('Rent Expense', '₱25,000.00');
    this.addLineItem('Utilities Expense', '₱8,500.00');
    this.addLineItem('Wages and Salaries', '₱15,200.00');
    this.addLineItem('Marketing Expense', '₱2,400.00');
    this.addTotalLine('Total Operating Expenses', '₱51,100.00');
    this.currentY += 8;

    // Net Income
    this.addHighlightedTotal('NET INCOME', '₱45,200.00', 'Net Margin: 23.8%');
  }

  private addBalanceSheet(): void {
    // Assets
    this.addSectionHeader('ASSETS');
    this.currentY += 3;
    
    this.addSubsectionHeader('Current Assets');
    this.addLineItem('Cash and Cash Equivalents', '₱125,000');
    this.addLineItem('Accounts Receivable', '₱35,500');
    this.addLineItem('Inventory', '₱68,200');
    this.addTotalLine('Total Current Assets', '₱228,700');
    this.currentY += 3;

    this.addSubsectionHeader('Fixed Assets');
    this.addLineItem('Equipment', '₱180,000');
    this.addLineItem('Less: Accumulated Depreciation', '(₱25,000)');
    this.addTotalLine('Net Fixed Assets', '₱155,000');
    this.currentY += 5;

    this.addHighlightedTotal('TOTAL ASSETS', '₱383,700');
    this.currentY += 10;

    // Liabilities & Equity
    this.addSectionHeader('LIABILITIES & EQUITY');
    this.currentY += 3;
    
    this.addSubsectionHeader('Current Liabilities');
    this.addLineItem('Accounts Payable', '₱45,500');
    this.addLineItem('Accrued Expenses', '₱12,200');
    this.addTotalLine('Total Current Liabilities', '₱57,700');
    this.currentY += 3;

    this.addSubsectionHeader('Equity'); 
    this.addLineItem('Owners Equity', '₱280,800');
    this.addLineItem('Current Year Earnings', '₱45,200');
    this.addTotalLine('Total Equity', '₱326,000');
    this.currentY += 5;

    this.addHighlightedTotal('TOTAL LIABILITIES & EQUITY', '₱383,700');
  }

  private addCashFlowStatement(): void {
    // Operating Activities
    this.addSectionHeader('CASH FLOWS FROM OPERATING ACTIVITIES');
    this.addLineItem('Net Income', '₱45,200');
    this.addLineItem('Depreciation Expense', '₱5,000');
    this.addLineItem('Changes in Working Capital:', '');
    this.addLineItem('  Increase in Accounts Receivable', '(₱8,500)', true);
    this.addLineItem('  Increase in Inventory', '(₱12,200)', true);
    this.addLineItem('  Increase in Accounts Payable', '₱6,800', true);
    this.addHighlightedTotal('Net Cash from Operating Activities', '₱36,300');
    this.currentY += 8;

    // Investing Activities
    this.addSectionHeader('CASH FLOWS FROM INVESTING ACTIVITIES');
    this.addLineItem('Purchase of Equipment', '(₱15,000)');
    this.addHighlightedTotal('Net Cash used in Investing Activities', '(₱15,000)');
    this.currentY += 8;

    // Financing Activities
    this.addSectionHeader('CASH FLOWS FROM FINANCING ACTIVITIES');
    this.addLineItem('Owner Withdrawals', '(₱10,000)');
    this.addHighlightedTotal('Net Cash used in Financing Activities', '(₱10,000)');
    this.currentY += 8;

    // Net Change
    this.addSectionHeader('NET CHANGE IN CASH');
    this.addLineItem('Net Increase in Cash', '₱11,300');
    this.addLineItem('Cash at Beginning of Period', '₱113,700');
    this.addHighlightedTotal('Cash at End of Period', '₱125,000');
  }

  private addSectionHeader(title: string): void {
    this.doc.setFontSize(12);
    this.doc.setFont(undefined, 'bold');
    this.doc.text(title, 20, this.currentY);
    this.currentY += 8;
    
    // Add underline
    this.doc.line(20, this.currentY - 2, this.pageWidth - 20, this.currentY - 2);
    this.doc.setFont(undefined, 'normal');
  }

  private addSubsectionHeader(title: string): void {
    this.doc.setFontSize(10);
    this.doc.setFont(undefined, 'bold');
    this.doc.text(title, 25, this.currentY);
    this.currentY += 6;
    this.doc.setFont(undefined, 'normal');
  }

  private addLineItem(label: string, amount: string, indent: boolean = false): void {
    this.doc.setFontSize(9);
    const x = indent ? 35 : 30;
    this.doc.text(label, x, this.currentY);
    if (amount) {
      this.doc.text(amount, this.pageWidth - 30, this.currentY, { align: 'right' });
    }
    this.currentY += 5;
  }

  private addTotalLine(label: string, amount: string): void {
    this.doc.setFont(undefined, 'bold');
    this.doc.setFontSize(9);
    
    // Add line above total
    this.doc.line(30, this.currentY - 1, this.pageWidth - 30, this.currentY - 1);
    
    this.doc.text(label, 30, this.currentY + 3);
    this.doc.text(amount, this.pageWidth - 30, this.currentY + 3, { align: 'right' });
    this.currentY += 8;
    this.doc.setFont(undefined, 'normal');
  }

  private addHighlightedTotal(label: string, amount: string, note?: string): void {
    // Add background rectangle
    this.doc.setFillColor(240, 248, 255);
    this.doc.rect(25, this.currentY - 2, this.pageWidth - 50, 12, 'F');
    
    this.doc.setFont(undefined, 'bold');
    this.doc.setFontSize(10);
    this.doc.text(label, 30, this.currentY + 5);
    this.doc.text(amount, this.pageWidth - 30, this.currentY + 5, { align: 'right' });
    
    if (note) {
      this.doc.setFont(undefined, 'normal');
      this.doc.setFontSize(8);
      this.doc.text(note, 30, this.currentY + 9);
    }
    
    this.currentY += 15;
    this.doc.setFont(undefined, 'normal');
  }

  private addCenteredText(text: string): void {
    this.doc.text(text, this.pageWidth / 2, this.currentY, { align: 'center' });
  }
}

export const generateFinancialStatementPdf = (
  statementType: 'income' | 'balance' | 'cashflow',
  storeName: string,
  period: string
): string => {
  const generator = new FinancialStatementPdfGenerator();
  return generator.generateStatement({
    statementType,
    storeName,
    period,
    data: null // Using mock data for now
  });
};