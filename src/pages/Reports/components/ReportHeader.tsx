
import { Button } from "@/components/ui/button";
import { FileDown, Printer } from "lucide-react";
import { ReportType } from "..";

interface ReportHeaderProps {
  storeId: string;
  reportType: ReportType;
  isAllStores?: boolean;
}

export function ReportHeader({ storeId, reportType, isAllStores }: ReportHeaderProps) {
  const getReportTitle = (type: ReportType) => {
    switch (type) {
      case 'sales':
        return 'Sales Report';
      case 'expense':
        return 'Expense Report';
      case 'profit_loss':
        return 'Profit & Loss Analysis';
      case 'x_reading':
        return 'X-Reading Report';
      case 'z_reading':
        return 'Z-Reading Report';
      case 'vat':
        return 'VAT Report';
      case 'cashier':
        return 'Cashier Performance';
      default:
        return 'Report';
    }
  };

  const handleExportCSV = () => {
    // Implement CSV export functionality
    console.log(`Exporting ${reportType} report as CSV`);
  };

  const handlePrint = () => {
    // Implement print functionality
    window.print();
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
      <div>
        <h1 className="text-2xl font-bold text-croffle-primary">{getReportTitle(reportType)}</h1>
        <p className="text-sm text-muted-foreground">
          {isAllStores ? 'All Stores - ' : ''}Generate and analyze your business data
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <FileDown className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
