
import { ReportType } from "..";
import { SalesReportView } from "./reports/SalesReportView";
import { ExpenseReportView } from "./reports/ExpenseReportView";
import { ProfitLossReportView } from "./reports/ProfitLossReportView";
import { XReadingView } from "./reports/XReadingView";
import { ZReadingView } from "./reports/ZReadingView";
import { BIREJournalView } from "./reports/BIREJournalView";
import { BIRDataBackupView } from "./reports/BIRDataBackupView";
import { VATReportView } from "./reports/VATReportView";
import { CashierReportView } from "./reports/CashierReportView";
import CashierShiftReportView from "./reports/CashierShiftReportView";
import CashierInventoryReportView from "./reports/CashierInventoryReportView";

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
  // Use selectedStoreId with fallback to storeId to ensure we always have a valid store ID
  const effectiveStoreId = selectedStoreId || storeId;
  
  switch (reportType) {
    case 'sales':
      return <SalesReportView data={data} dateRange={dateRange} isAllStores={isAllStores} storeId={effectiveStoreId} />;
    case 'expense':
      return <ExpenseReportView data={data} dateRange={dateRange} isAllStores={isAllStores} storeId={storeId} selectedStoreId={effectiveStoreId} />;
    case 'profit_loss':
      return <ProfitLossReportView data={data} dateRange={dateRange} isAllStores={isAllStores} />;
    case 'x_reading':
      return <XReadingView storeId={effectiveStoreId} date={dateRange.from} />;
    case 'z_reading':
      return <ZReadingView storeId={effectiveStoreId} date={dateRange.from} />;
    case 'bir_ejournal':
      return <BIREJournalView storeId={effectiveStoreId} date={dateRange.from} />;
    case 'bir_backup':
      return <BIRDataBackupView storeId={effectiveStoreId} />;
    case 'vat':
      return <VATReportView storeId={effectiveStoreId} dateRange={dateRange} />;
    case 'cashier':
      return <CashierReportView 
        data={data} 
        storeId={storeId} 
        selectedStoreId={effectiveStoreId} 
        isAllStores={isAllStores} 
        dateRange={dateRange} 
      />;
    case 'daily_shift':
      return <CashierShiftReportView dateRange={dateRange} />;
    case 'inventory_status':
      return <CashierInventoryReportView />;
    default:
      return null;
  }
}
