
import { useQuery } from "@tanstack/react-query";
import { ReportType } from "..";
import { fetchSalesReport, fetchInventoryReport, fetchProfitLossReport, fetchStockReport } from "@/services/reports";

interface UseReportDataProps {
  reportType: ReportType;
  storeId: string;
  from?: string;
  to?: string;
}

export function useReportData({ reportType, storeId, from, to }: UseReportDataProps) {
  const queryResult = useQuery({
    queryKey: ['report', reportType, storeId, from, to],
    queryFn: async () => {
      if (!from || !to) return Promise.resolve(null);
      
      console.log(`Fetching ${reportType} report for store ${storeId} from ${from} to ${to}`);
      
      try {
        switch (reportType) {
          case 'sales':
            return await fetchSalesReport(storeId, from, to);
          case 'inventory':
            return await fetchInventoryReport(storeId, from, to);
          case 'profit_loss':
            return await fetchProfitLossReport(storeId, from, to);
          case 'stock':
            return await fetchStockReport(storeId, from, to);
          default:
            return Promise.resolve(null);
        }
      } catch (error) {
        console.error(`Error fetching ${reportType} report:`, error);
        throw error;
      }
    },
    enabled: !!storeId && !!from && !!to && ['sales', 'inventory', 'profit_loss', 'stock'].includes(reportType),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false
  });

  return {
    ...queryResult,
    refetch: () => {
      console.log("Manually refetching report data...");
      return queryResult.refetch();
    }
  };
}
