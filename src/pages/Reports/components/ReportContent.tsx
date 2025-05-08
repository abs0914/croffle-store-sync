
import { ReportType } from "..";
import { ReportLoadingState } from "./ReportLoadingState";
import { ReportErrorState } from "./ReportErrorState";
import { ReportView } from "./ReportView";
import { useReportData } from "../hooks/useReportData";

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
  const { data, isLoading, error } = useReportData({ 
    reportType, 
    storeId, 
    from, 
    to 
  });
  
  if (isLoading) {
    return <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState />;
  }

  return (
    <div>
      <ReportView 
        reportType={reportType}
        data={data}
        storeId={storeId}
        dateRange={dateRange}
      />
    </div>
  );
}
