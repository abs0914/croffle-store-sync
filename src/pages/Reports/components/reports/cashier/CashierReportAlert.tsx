
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { CashierReport } from "@/types/reports";

interface CashierReportAlertProps {
  data: CashierReport;
}

export function CashierReportAlert({ data }: CashierReportAlertProps) {
  // Determine if we're looking at sample data
  const isSampleData = !data.cashiers.some(c => c.transactionCount > 0);

  if (!isSampleData) {
    return null;
  }

  return (
    <Alert variant="default" className="bg-amber-50 text-amber-800 border-amber-200">
      <Info className="h-4 w-4" />
      <AlertDescription>
        Showing sample data. Connect to your database and complete transactions to see actual cashier performance.
      </AlertDescription>
    </Alert>
  );
}
