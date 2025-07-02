
import { ReportType } from "..";
import { SalesReportView } from "./reports/SalesReportView";
import { InventoryReportView } from "./reports/InventoryReportView";
import { ProfitLossReportView } from "./reports/ProfitLossReportView";
import { XReadingView } from "./reports/XReadingView";
import { ZReadingView } from "./reports/ZReadingView";
import { BIREJournalView } from "./reports/BIREJournalView";
import { BIRDataBackupView } from "./reports/BIRDataBackupView";
import { DailySummaryView } from "./reports/DailySummaryView";
import { VATReportView } from "./reports/VATReportView";
import { CashierReportView } from "./reports/CashierReportView";
import { StockReportView } from "./reports/StockReportView";

interface ReportViewProps {
  reportType: ReportType;
  data: any;
  storeId: string;
  selectedStoreId: string;
  isAllStores?: boolean;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function ReportView({ reportType, data, storeId, selectedStoreId, isAllStores, dateRange }: ReportViewProps) {
  switch (reportType) {
    case 'sales':
      return <SalesReportView data={data} dateRange={dateRange} isAllStores={isAllStores} />;
    case 'inventory':
      return <InventoryReportView data={data} dateRange={dateRange} isAllStores={isAllStores} />;
    case 'stock':
      return <StockReportView data={data} dateRange={dateRange} isAllStores={isAllStores} />;
    case 'profit_loss':
      return <ProfitLossReportView data={data} dateRange={dateRange} isAllStores={isAllStores} />;
    case 'x_reading':
      return <XReadingView storeId={selectedStoreId} date={dateRange.from} />;
    case 'z_reading':
      return <ZReadingView storeId={selectedStoreId} date={dateRange.from} />;
    case 'bir_ejournal':
      return <BIREJournalView storeId={selectedStoreId} date={dateRange.from} />;
    case 'bir_backup':
      return <BIRDataBackupView storeId={selectedStoreId} />;
    case 'daily_summary':
      return <DailySummaryView storeId={selectedStoreId} date={dateRange.from} />;
    case 'vat':
      return <VATReportView storeId={selectedStoreId} dateRange={dateRange} />;
    case 'cashier':
      return <CashierReportView 
        data={data} 
        storeId={storeId} 
        selectedStoreId={selectedStoreId} 
        isAllStores={isAllStores} 
        dateRange={dateRange} 
      />;
    default:
      return null;
  }
}
