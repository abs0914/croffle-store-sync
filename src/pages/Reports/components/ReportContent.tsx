import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportType } from "..";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { fetchSalesReport, fetchInventoryReport, fetchProfitLossReport } from "@/services/reports";
import { SalesReportView } from "./reports/SalesReportView";
import { InventoryReportView } from "./reports/InventoryReportView";
import { ProfitLossReportView } from "./reports/ProfitLossReportView";
import { XReadingView } from "./reports/XReadingView";
import { ZReadingView } from "./reports/ZReadingView";
import { DailySummaryView } from "./reports/DailySummaryView";
import { VATReportView } from "./reports/VATReportView";
import { CashierReportView } from "./reports/CashierReportView";

interface ReportContentProps {
  reportType: ReportType;
  storeId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function ReportContent({ reportType, storeId, dateRange }: ReportContentProps) {
  const from = dateRange.from?.toISOString().split('T')[0];
  const to = dateRange.to?.toISOString().split('T')[0];
  
  // Fetch data based on report type
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', reportType, storeId, from, to],
    queryFn: () => {
      if (!from || !to) return Promise.resolve(null);
      
      switch (reportType) {
        case 'sales':
          return fetchSalesReport(storeId, from, to);
        case 'inventory':
          return fetchInventoryReport(storeId, from, to);
        case 'profit_loss':
          return fetchProfitLossReport(storeId, from, to);
        // Other report types will be handled by their specific components
        default:
          return Promise.resolve(null);
      }
    },
    enabled: !!storeId && !!from && !!to && ['sales', 'inventory', 'profit_loss'].includes(reportType)
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Spinner className="h-8 w-8 text-croffle-accent" />
            <p className="text-muted-foreground">Loading report data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-10">
            <p className="text-destructive">Error loading report data</p>
            <p className="text-muted-foreground text-sm mt-2">Please try again later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {reportType === 'sales' && <SalesReportView data={data} dateRange={dateRange} />}
      {reportType === 'inventory' && <InventoryReportView data={data} dateRange={dateRange} />}
      {reportType === 'profit_loss' && <ProfitLossReportView data={data} dateRange={dateRange} />}
      {reportType === 'x_reading' && <XReadingView storeId={storeId} date={dateRange.from} />}
      {reportType === 'z_reading' && <ZReadingView storeId={storeId} date={dateRange.from} />}
      {reportType === 'daily_summary' && <DailySummaryView storeId={storeId} date={dateRange.from} />}
      {reportType === 'vat' && <VATReportView storeId={storeId} dateRange={dateRange} />}
      {reportType === 'cashier' && <CashierReportView storeId={storeId} dateRange={dateRange} />}
    </div>
  );
}
