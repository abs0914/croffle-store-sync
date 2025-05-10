
import { ReportType } from "..";
import { SalesReportView } from "./reports/SalesReportView";
import { InventoryReportView } from "./reports/InventoryReportView";
import { ProfitLossReportView } from "./reports/ProfitLossReportView";
import { XReadingView } from "./reports/XReadingView";
import { ZReadingView } from "./reports/ZReadingView";
import { DailySummaryView } from "./reports/DailySummaryView";
import { VATReportView } from "./reports/VATReportView";
import { CashierReportView } from "./reports/CashierReportView";
import { StockReportView } from "./reports/StockReportView";

interface ReportViewProps {
  reportType: ReportType;
  data: any;
  storeId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function ReportView({ reportType, data, storeId, dateRange }: ReportViewProps) {
  switch (reportType) {
    case 'sales':
      return <SalesReportView data={data} dateRange={dateRange} />;
    case 'inventory':
      return <InventoryReportView data={data} dateRange={dateRange} />;
    case 'stock':
      return <StockReportView data={data} dateRange={dateRange} />;
    case 'profit_loss':
      return <ProfitLossReportView data={data} dateRange={dateRange} />;
    case 'x_reading':
      return <XReadingView storeId={storeId} date={dateRange.from} />;
    case 'z_reading':
      return <ZReadingView storeId={storeId} date={dateRange.from} />;
    case 'daily_summary':
      return <DailySummaryView storeId={storeId} date={dateRange.from} />;
    case 'vat':
      return <VATReportView storeId={storeId} dateRange={dateRange} />;
    case 'cashier':
      return <CashierReportView data={data} storeId={storeId} dateRange={dateRange} />;
    default:
      return null;
  }
}
