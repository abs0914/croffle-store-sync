
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileBarChart, FileBox, FileSpreadsheet, FileText, Receipt, UserRound, BarChart, Warehouse } from "lucide-react";
import { ReportType } from "..";
import { useAuth } from "@/contexts/auth";

interface ReportsNavigationProps {
  activeReport: ReportType;
  onSelectReport: (report: ReportType) => void;
}

export function ReportsNavigation({ activeReport, onSelectReport }: ReportsNavigationProps) {
  const { user } = useAuth();

  const allNavItems = [
    { id: 'sales' as ReportType, name: 'Sales Report', icon: <FileBarChart className="h-4 w-4" />, roles: ['admin', 'owner', 'manager', 'cashier'] },
    { id: 'inventory' as ReportType, name: 'Menu Report', icon: <FileBox className="h-4 w-4" />, roles: ['admin', 'owner', 'manager', 'cashier'] },
    { id: 'stock' as ReportType, name: 'Stock Report', icon: <Warehouse className="h-4 w-4" />, roles: ['admin', 'owner', 'manager'] },
    { id: 'profit_loss' as ReportType, name: 'Profit & Loss', icon: <FileSpreadsheet className="h-4 w-4" />, roles: ['admin', 'owner', 'manager'] },
    { id: 'cashier' as ReportType, name: 'Cashier Performance', icon: <UserRound className="h-4 w-4" />, roles: ['admin', 'owner', 'manager'] },

    // Separator for BIR Reports
    null,

    // BIR Reports
    { id: 'x_reading' as ReportType, name: 'X-Reading Report', icon: <Receipt className="h-4 w-4" />, roles: ['admin', 'owner', 'manager'] },
    { id: 'z_reading' as ReportType, name: 'Z-Reading Report', icon: <Receipt className="h-4 w-4" />, roles: ['admin', 'owner', 'manager'] },
    { id: 'daily_summary' as ReportType, name: 'Daily Sales Summary', icon: <FileText className="h-4 w-4" />, roles: ['admin', 'owner', 'manager', 'cashier'] },
    { id: 'vat' as ReportType, name: 'VAT Report', icon: <FileText className="h-4 w-4" />, roles: ['admin', 'owner', 'manager'] },
  ];

  // Filter navigation items based on user role
  const navItems = allNavItems.filter(item => {
    if (item === null) return true; // Keep separators
    if (!user?.role) return false;
    return item.roles.includes(user.role);
  });

  return (
    <Card className="p-2">
      <div className="space-y-1">
        {navItems.map((item, index) =>
          item === null ? (
            <div key={`separator-${index}`} className="my-2 px-2">
              <Separator />
              <p className="text-xs text-muted-foreground mt-2 font-medium">BIR Reports</p>
            </div>
          ) : (
            <Button
              key={item.id}
              variant={activeReport === item.id ? "default" : "ghost"}
              className={`w-full justify-start ${activeReport === item.id ? 'bg-croffle-accent text-white' : ''}`}
              onClick={() => onSelectReport(item.id)}
            >
              {item.icon}
              <span className="ml-2">{item.name}</span>
            </Button>
          )
        )}
      </div>
    </Card>
  );
}
