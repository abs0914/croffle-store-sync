
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
