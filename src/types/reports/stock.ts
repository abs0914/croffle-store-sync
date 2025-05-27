
import { StoreBreakdown } from './base';

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
  storeBreakdown?: StoreBreakdown[];
}
