
export interface XReadingReport {
  storeName: string;
  storeAddress: string;
  contactInfo: string;
  taxId?: string;
  cashierName: string;
  terminal: string;
  beginningReceiptNumber: string;
  endingReceiptNumber: string;
  transactionCount: number;
  grossSales: number;
  vatableSales: number;
  vatExemptSales: number;
  vatZeroRatedSales: number;
  totalDiscounts: number;
  seniorDiscount: number;
  pwdDiscount: number;
  employeeDiscount: number;
  otherDiscounts: number;
  netSales: number;
  vatAmount: number;
  vatExempt: number;
  vatZeroRated: number;
  cashPayments: number;
  cardPayments: number;
  eWalletPayments: number;
  totalPayments: number;
}

export interface ZReadingReport extends XReadingReport {
  storeManager: string;
  totalRefunds: number;
  beginningCash: number;
  cashSales: number;
  cashPayouts: number;
  expectedCash: number;
  actualCash: number;
  cashVariance: number;
  accumulatedGrossSales: number;
  accumulatedVAT: number;
}

export interface DailySalesSummary {
  totalSales: number;
  transactionCount: number;
  totalItemsSold: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    totalSales: number;
  }>;
  paymentMethods: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
}

export interface VATReport {
  transactions: Array<{
    date: string;
    receiptNumber: string;
    transactionType: string;
    vatableSales: number;
    vatAmount: number;
    vatExemptSales: number;
    vatZeroRatedSales: number;
    // For multi-store support
    storeId?: string;
    storeName?: string;
  }>;
  totals: {
    vatableSales: number;
    vatAmount: number;
    vatExemptSales: number;
    vatZeroRatedSales: number;
  };
}
