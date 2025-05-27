
import { StoreBreakdown } from './base';

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
