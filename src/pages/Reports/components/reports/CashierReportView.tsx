
import { CashierReport } from "@/types/reports";
import { CashierReportContainer } from "./cashier/CashierReportContainer";

interface CashierReportViewProps {
  storeId: string;
  selectedStoreId?: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  data: CashierReport;
  isAllStores?: boolean;
}

export function CashierReportView(props: CashierReportViewProps) {
  return <CashierReportContainer {...props} />;
}
