
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { CashierReport } from "@/types/reports";

interface CashierReportAlertProps {
  data: CashierReport;
}

export function CashierReportAlert({ data }: CashierReportAlertProps) {
  // Determine if we're looking at sample data by checking for specific sample data patterns
  const isSampleData = data.cashiers.length > 0 &&
    data.cashiers.some(c =>
      c.name === 'John Smith' ||
      c.name === 'Sarah Lee' ||
      c.name === 'Miguel Rodriguez' ||
      c.name === 'Priya Patel' ||
      (c.avatar && c.avatar.includes('pravatar.cc'))
    );

  // Only show in development environments
  const isDevelopment = window.location.hostname === 'localhost' ||
                        window.location.hostname.includes('staging') ||
                        window.location.hostname.includes('.lovable.app');

  if (!isSampleData || !isDevelopment) {
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
