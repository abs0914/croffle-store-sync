import React from 'react';
import { useAuth } from '@/contexts/auth';
import { ReportType } from '@/pages/Reports';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface CashierReportGuardProps {
  children: React.ReactNode;
  reportType: ReportType;
}

// Define which reports cashiers can access
const CASHIER_ALLOWED_REPORTS: ReportType[] = [
  'sales',           // Sales Report
  'inventory',       // Inventory Report  
  'daily_shift',     // My Daily Shift Report
  'inventory_status' // Inventory Status
];

export function CashierReportGuard({ children, reportType }: CashierReportGuardProps) {
  const { user } = useAuth();

  // If user is not a cashier, allow access (other roles have broader permissions)
  if (!user || user.role !== 'cashier') {
    return <>{children}</>;
  }

  // Check if cashier has access to this specific report type
  const hasAccess = CASHIER_ALLOWED_REPORTS.includes(reportType);

  if (!hasAccess) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            As a cashier, you have access to sales reports, inventory status, and your shift reports. 
            Please contact your manager if you need access to other reports.
          </AlertDescription>
        </Alert>
        
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Available reports for cashiers:
          </p>
          <ul className="mt-2 text-sm text-muted-foreground">
            <li>• Sales Report</li>
            <li>• Inventory Report</li>
            <li>• My Daily Shift Report</li>
            <li>• Inventory Status</li>
          </ul>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
