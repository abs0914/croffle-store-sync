
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

interface ReportContentProps {
  reportType: ReportType;
  storeId: string;
  selectedStoreId: string; // Added for multi-store support
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function ReportContent({ reportType, storeId, selectedStoreId, dateRange }: ReportContentProps) {
  const isMobile = useIsMobile();
  const from = dateRange.from?.toISOString().split('T')[0];
  const to = dateRange.to?.toISOString().split('T')[0];
  
  // Determine if we're in development/staging environment to warn about sample data
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname.includes('staging') ||
                        window.location.hostname.includes('.lovable.app');
  
  // Fetch data based on report type
  const { data, isLoading, error, refetch, isSampleData } = useReportData({ 
    reportType, 
    storeId: selectedStoreId, // Use the selected store ID for fetching data
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
      if (isSampleData && isDevelopment) {
        toast.warning("Using demo data", {
          description: "This report is using sample data for demonstration purposes.",
          duration: 5000,
          position: isMobile ? "top-center" : "top-right"
        });
      } else {
        toast.success("Report data loaded successfully", {
          duration: 3000,
          position: isMobile ? "top-center" : "top-right"
        });
      }
    }
  }, [data, error, isLoading, isSampleData, isDevelopment, isMobile]);

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

  // Render report content
  return (
    <div className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" tabIndex={0}>
      <ReportView 
        reportType={reportType}
        data={data}
        storeId={storeId}
        selectedStoreId={selectedStoreId} // Pass the selected store ID to the report view
        isAllStores={selectedStoreId === 'all'} // Indicate if we're viewing all stores
        dateRange={dateRange}
      />
    </div>
  );
}
