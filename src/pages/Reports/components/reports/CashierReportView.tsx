
import { CashierReport } from "@/types/reports";
import { CashierReportContainer } from "./cashier/CashierReportContainer";

interface CashierReportViewProps {
  storeId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  data: CashierReport;
}

export function CashierReportView(props: CashierReportViewProps) {
  return <CashierReportContainer {...props} />;
}
