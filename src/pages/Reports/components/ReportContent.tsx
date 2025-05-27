
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
  const from = dateRange.from?.toISOString().split('T')[0];
  const to = dateRange.to?.toISOString().split('T')[0];

  // Fetch data based on report type
  const { data, dataSource, generatedAt, debugInfo, isLoading, error, refetch } = useReportData({
    reportType,
    storeId: selectedStoreId,
    isAllStores: selectedStoreId === 'all',
    from,
    to
  });

  // Display toast notifications for success/failure
  useEffect(() => {
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
  }, [data, error, isLoading, dataSource, isMobile]);

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
                Try adjusting your date range or selected report
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
          selectedStoreId={selectedStoreId}
          isAllStores={selectedStoreId === 'all'}
          dateRange={dateRange}
        />
      </CashierReportGuard>
    </div>
  );
}
