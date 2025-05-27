
import { StoreBreakdown } from './base';

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
  storeBreakdown?: StoreBreakdown[];
}
