
export type DataSource = 'real' | 'sample' | 'mixed';

export interface ReportWithDataSource<T> {
  data: T;
  dataSource: DataSource;
  generatedAt: string;
  debugInfo?: {
    queryAttempts?: string[];
    fallbackReason?: string;
    recordCount?: number;
  };
}

export function createReportResponse<T>(
  data: T, 
  dataSource: DataSource, 
  debugInfo?: ReportWithDataSource<T>['debugInfo']
): ReportWithDataSource<T> {
  return {
    data,
    dataSource,
    generatedAt: new Date().toISOString(),
    debugInfo
  };
}

export function detectSampleDataPatterns(data: any): boolean {
  // Check for specific sample data indicators
  if (!data) return false;
  
  // Cashier report sample data detection
  if (data.cashiers && Array.isArray(data.cashiers)) {
    const hasSampleCashiers = data.cashiers.some((c: any) => 
      c.name === 'John Smith' || 
      c.name === 'Sarah Lee' || 
      c.name === 'Miguel Rodriguez' || 
      c.name === 'Priya Patel' ||
      (c.avatar && c.avatar.includes('pravatar.cc'))
    );
    if (hasSampleCashiers) return true;
  }
  
  // Sales report sample data detection
  if (data.salesByDate && Array.isArray(data.salesByDate)) {
    const hasRoundNumbers = data.salesByDate.every((d: any) => 
      d.amount % 10 === 0 && d.amount > 0
    );
    if (hasRoundNumbers && data.salesByDate.length > 0) return true;
  }
  
  // Inventory report sample data detection
  if (data.inventoryItems && Array.isArray(data.inventoryItems)) {
    const hasSamplePattern = data.inventoryItems.every((item: any) => 
      item.soldUnits % 5 === 0
    );
    if (hasSamplePattern && data.inventoryItems.length > 0) return true;
  }
  
  return false;
}
