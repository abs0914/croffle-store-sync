
export interface SalesReport {
  totalSales: number;
  totalTransactions: number;
  salesByDate: Array<{
    date: string;
    amount: number;
    transactions: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  paymentMethods: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
}

export interface InventoryReport {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  inventoryItems: Array<{
    name: string;
    sku: string;
    initialStock: number;
    currentStock: number;
    soldUnits: number;
    threshold: number;
  }>;
}

export interface ProfitLossReport {
  totalRevenue: number;
  costOfGoods: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  profitByDate: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  productProfitability: Array<{
    name: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>;
}

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
  }>;
  totals: {
    vatableSales: number;
    vatAmount: number;
    vatExemptSales: number;
    vatZeroRatedSales: number;
  };
}

export interface CashierReport {
  cashierCount: number;
  totalTransactions: number;
  averageTransactionValue: number;
  averageTransactionTime: number; // in minutes
  cashiers: Array<{
    name: string;
    avatar?: string;
    transactionCount: number;
    totalSales: number;
    averageTransactionValue: number; 
    averageTransactionTime: number; // in minutes
  }>;
  hourlyData: Array<{
    hour: string;
    sales: number;
    transactions: number;
  }>;
}
