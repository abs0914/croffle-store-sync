
// Base types shared across all reports
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

// Common store breakdown interface used by multiple reports
export interface StoreBreakdown {
  storeId: string;
  storeName: string;
  totalSales?: number;
  totalTransactions?: number;
  revenue?: number;
  cost?: number;
  profit?: number;
  percentage: number;
  totalItems?: number;
  lowStockItems?: number;
  outOfStockItems?: number;
}
