
import { ReportType } from "..";
import { ReportLoadingState } from "./ReportLoadingState";
import { ReportErrorState } from "./ReportErrorState";
import { ReportView } from "./ReportView";
import { useReportData } from "../hooks/useReportData";
import { useEffect } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";
import { CashierReportGuard } from "@/components/auth/CashierReportGuard";
import { DataSourceIndicator } from "@/components/reports/DataSourceIndicator";

interface ReportContentProps {
  reportType: ReportType;
  storeId: string;
  selectedStoreId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function ReportContent({ reportType, storeId, selectedStoreId, dateRange }: ReportContentProps) {
  const isMobile = useIsMobile();
  
  // Safety check for undefined dateRange
  if (!dateRange) {
    console.error('ReportContent: dateRange is undefined');
    return <ReportErrorState errorMessage="Date range not available" />;
  }
  
  const from = dateRange.from?.toISOString().split('T')[0];
  const to = dateRange.to?.toISOString().split('T')[0];

  // Check if this is a special cashier report that doesn't need data fetching
  const isSpecialCashierReport = reportType === 'daily_shift' || reportType === 'inventory_status';

  // Use selectedStoreId if available, fallback to storeId for data fetching
  const effectiveStoreId = selectedStoreId || storeId;
  
  // Fetch data based on report type (but only for non-special reports)
  const { data, dataSource, generatedAt, debugInfo, isLoading, error, refetch } = useReportData({
    reportType,
    storeId: effectiveStoreId,
    isAllStores: effectiveStoreId === 'all',
    from,
    to
  });

  // Log report parameters for debugging
  useEffect(() => {
    console.log('📊 ReportContent props:', {
      reportType,
      storeId: storeId.slice(0, 8),
      selectedStoreId: selectedStoreId === 'all' ? 'ALL_STORES' : selectedStoreId?.slice(0, 8) || 'EMPTY',
      effectiveStoreId: effectiveStoreId === 'all' ? 'ALL_STORES' : effectiveStoreId?.slice(0, 8),
      isAllStores: effectiveStoreId === 'all',
      dateRange: { from, to }
    });
  }, [reportType, storeId, selectedStoreId, effectiveStoreId, from, to]);

  // Display toast notifications for success/failure (only for regular reports)
  useEffect(() => {
    if (!isSpecialCashierReport) {
      if (error) {
        toast.error("Failed to load report data", {
          description: "Please check your connection and try again",
          duration: 4000,
        });
      } else if (data && !isLoading) {
        if (dataSource === 'sample') {
          toast.warning("Showing demo data", {
            description: "This report contains sample data for demonstration.",
            duration: 5000,
            position: isMobile ? "top-center" : "top-right"
          });
        } else if (dataSource === 'real') {
          toast.success("Report data loaded successfully", {
            duration: 3000,
            position: isMobile ? "top-center" : "top-right"
          });
        }
      }
    }
  }, [data, error, isLoading, dataSource, isMobile, isSpecialCashierReport]);

  // Handle special cashier reports that don't use the standard data fetching
  if (isSpecialCashierReport) {
    return (
      <div className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring space-y-4" tabIndex={0}>
        <CashierReportGuard reportType={reportType}>
          <ReportView
            reportType={reportType}
            data={null}
            storeId={storeId}
            selectedStoreId={effectiveStoreId}
            isAllStores={effectiveStoreId === 'all'}
            dateRange={dateRange}
          />
        </CashierReportGuard>
      </div>
    );
  }

  // Handle report loading state
  if (isLoading) {
    return <ReportLoadingState />;
  }

  // Handle error state with retry option
  if (error) {
    return <ReportErrorState
      onRetry={() => refetch()}
      errorMessage="Unable to load report data"
    />;
  }

  // Handle empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <Card className="p-6 text-center">
        <CardContent className={`${isMobile ? 'py-6' : 'py-10'}`}>
          <div className="flex flex-col items-center gap-4">
            <FileBarChart className="h-12 w-12 text-muted-foreground/60" />
            <div>
              <p className="font-medium text-lg">No data available</p>
              <p className="text-muted-foreground text-sm mt-2">
                No {reportType} data found for {effectiveStoreId === 'all' ? 'all stores' : 'the selected store'} in the date range {from} to {to}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your date range or selected store
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render report content with data source indicator
  return (
    <div className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring space-y-4" tabIndex={0}>
      <DataSourceIndicator 
        dataSource={dataSource}
        generatedAt={generatedAt}
        debugInfo={debugInfo}
        showFullAlert={true}
      />
      
      <CashierReportGuard reportType={reportType}>
        <ReportView
          reportType={reportType}
          data={data}
          storeId={storeId}
          selectedStoreId={effectiveStoreId}
          isAllStores={effectiveStoreId === 'all'}
          dateRange={dateRange}
        />
      </CashierReportGuard>
    </div>
  );
}
