
import { useQuery } from "@tanstack/react-query";
import { ReportType } from "..";
import { fetchSalesReport, fetchInventoryReport, fetchProfitLossReport } from "@/services/reports";

interface UseReportDataProps {
  reportType: ReportType;
  storeId: string;
  from?: string;
  to?: string;
}

export function useReportData({ reportType, storeId, from, to }: UseReportDataProps) {
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
        default:
          return Promise.resolve(null);
      }
    },
    enabled: !!storeId && !!from && !!to && ['sales', 'inventory', 'profit_loss'].includes(reportType)
  });

  return { data, isLoading, error };
}
