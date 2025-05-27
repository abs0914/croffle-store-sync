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
  // For multi-store support
  storeBreakdown?: Array<{
    storeId: string;
    storeName: string;
    totalSales: number;
    totalTransactions: number;
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
    // For multi-store support
    storeId?: string;
    storeName?: string;
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
  // For multi-store support
  storeBreakdown?: Array<{
    storeId: string;
    storeName: string;
    revenue: number;
    cost: number;
    profit: number;
    percentage: number;
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
    // For multi-store support
    storeId?: string;
    storeName?: string;
  }>;
  hourlyData: Array<{
    hour: string;
    sales: number;
    transactions: number;
  }>;
  attendance?: Array<{
    name: string;
    userId: string;
    startTime: string;
    endTime: string | null;
    startPhoto: string | null;
    endPhoto: string | null;
    startingCash: number;
    endingCash: number | null;
    // For multi-store support
    storeId?: string;
    storeName?: string;
  }>;
}

export interface StockReport {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  stockItems: Array<{
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    initialStock: number;
    consumed: number;
    threshold: number;
    lastUpdated: string;
    // For multi-store support
    storeId?: string;
    storeName?: string;
    transactions: Array<{
      date: string;
      type: string;
      quantity: number;
      previousStock: number;
      newStock: number;
    }>;
  }>;
  shiftData: Array<{
    shiftId: string;
    userId: string;
    userName: string;
    startTime: string;
    endTime: string | null;
    startInventory: Record<string, number>;
    endInventory: Record<string, number> | null;
    // For multi-store support
    storeId?: string;
    storeName?: string;
  }>;
  // For multi-store support
  storeBreakdown?: Array<{
    storeId: string;
    storeName: string;
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
  }>;
}

// Add data source metadata to all reports
export interface ReportMetadata {
  dataSource: 'real' | 'sample' | 'mixed';
  generatedAt: string;
  debugInfo?: {
    queryAttempts?: string[];
    fallbackReason?: string;
    recordCount?: number;
  };
}

// Enhanced report response wrapper
export interface EnhancedReportResponse<T> {
  data: T;
  metadata: ReportMetadata;
}
