
import { ReportType } from "..";
import { ReportLoadingState } from "./ReportLoadingState";
import { ReportErrorState } from "./ReportErrorState";
import { ReportView } from "./ReportView";
import { useReportData } from "../hooks/useReportData";
import { useEffect } from "react";
import React from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";
import { CashierReportGuard } from "@/components/auth/CashierReportGuard";
import { DataSourceIndicator } from "@/components/reports/DataSourceIndicator";
import { formatDate } from "@/utils";

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
  
  // Convert Date objects to proper string format for API calls
  const formattedDateRange = React.useMemo(() => {
    if (!dateRange.from) return { from: undefined, to: undefined };
    
    const fromStr = dateRange.from instanceof Date ? formatDate(dateRange.from) : dateRange.from;
    const toStr = dateRange.to instanceof Date ? formatDate(dateRange.to) : (dateRange.to ? formatDate(dateRange.to) : fromStr);
    
    console.log('📊 ReportContent formatted date range:', { 
      original: dateRange, 
      formatted: { from: fromStr, to: toStr }
    });
    
    return { from: fromStr, to: toStr };
  }, [dateRange]);

  const from = formattedDateRange.from;
  const to = formattedDateRange.to;

  // Check if this is a special cashier report that doesn't need data fetching
  const isSpecialCashierReport = reportType === 'daily_shift' || reportType === 'inventory_status';
  
  // Check if this is a BIR report that handles its own data fetching
  const isBIRReport = ['x_reading', 'z_reading', 'bir_ejournal', 'void_report'].includes(reportType);

  // Check if this is a compliance report that handles its own rendering
  const isComplianceReport = reportType === 'robinsons_compliance' || reportType === 'bir_backup';

  // Use selectedStoreId if available, fallback to storeId for data fetching
  const effectiveStoreId = selectedStoreId || storeId;
  
  // Fetch data based on report type (but only for standard reports that use centralized data fetching)
  const { data, dataSource, generatedAt, debugInfo, isLoading, error, refetch } = useReportData({
    reportType,
    storeId: effectiveStoreId,
    isAllStores: effectiveStoreId === 'all',
    from,
    to,
    useSampleData: false
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

  // Display toast notifications for success/failure (only for standard reports that use centralized data fetching)
  useEffect(() => {
    if (!isSpecialCashierReport && !isBIRReport && !isComplianceReport) {
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
  }, [data, error, isLoading, dataSource, isMobile, isSpecialCashierReport, isBIRReport, isComplianceReport]);

  // Handle compliance reports that handle their own rendering
  if (isComplianceReport) {
    return (
      <div className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring space-y-4" tabIndex={0}>
        <ReportView
          reportType={reportType}
          data={null}
          storeId={storeId}
          selectedStoreId={effectiveStoreId}
          isAllStores={effectiveStoreId === 'all'}
          dateRange={dateRange}
        />
      </div>
    );
  }

  // Handle BIR reports that handle their own data fetching
  if (isBIRReport) {
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
      errorMessage={error instanceof Error ? error.message : "Unable to load report data"}
      debugInfo={{
        reportType,
        storeId: effectiveStoreId,
        dateRange: `${from} to ${to}`,
        isAuthenticated: true
      }}
    />;
  }

  // Handle empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <ReportErrorState 
      errorMessage="No data available for this report"
      onRetry={() => refetch()}
      debugInfo={{
        reportType,
        storeId: effectiveStoreId,
        dateRange: `${from} to ${to}`,
        isAuthenticated: true
      }}
    />;
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
