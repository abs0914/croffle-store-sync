
import { StoreBreakdown } from './base';

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
  storeBreakdown?: StoreBreakdown[];
}
