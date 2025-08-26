
import { useQuery } from "@tanstack/react-query";
import { ReportType } from "..";
import {
  fetchSalesReport,
  fetchProfitLossReport,
  fetchCashierReport
} from "@/services/reports";
import { ReportWithDataSource } from "@/services/reports/utils/dataSourceUtils";

interface UseReportDataProps {
  reportType: ReportType;
  storeId: string;
  isAllStores?: boolean;
  from?: string;
  to?: string;
  useSampleData?: boolean;
}

export function useReportData({ reportType, storeId, isAllStores = false, from, to, useSampleData = false }: UseReportDataProps) {
  const queryResult = useQuery({
    queryKey: ['report', reportType, storeId, isAllStores, from, to, useSampleData],
    queryFn: async () => {
      if (!from || !to) return Promise.resolve(null);

      console.log(`🔄 Fetching ${reportType} report for ${isAllStores ? 'all stores' : `store ${storeId}`} from ${from} to ${to}`);
      console.log('📊 Query parameters:', { reportType, storeId, isAllStores, from, to, useSampleData });

      try {
        let result: ReportWithDataSource<any> | any = null;

        switch (reportType) {
          case 'sales':
            result = await fetchSalesReport(
              isAllStores ? 'all' : storeId,
              from,
              to
            );
            break;
          case 'expense':
            // Expense report data will be handled directly in the component
            result = { data: null, dataSource: 'real' };
            break;
          case 'profit_loss':
            result = await fetchProfitLossReport(
              isAllStores ? 'all' : storeId,
              from,
              to
            );
            break;
          case 'cashier':
            result = await fetchCashierReport(
              isAllStores ? 'all' : storeId,
              from,
              to
            );
            break;
          default:
            result = Promise.resolve(null);
            break;
        }

        return result;
      } catch (error) {
        console.error(`Error fetching ${reportType} report:`, error);
        throw error;
      }
    },
    enabled: !!storeId && !!from && !!to &&
            ['sales', 'expense', 'profit_loss', 'cashier'].includes(reportType),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false
  });

  // Handle both old and new response formats
  const responseData = queryResult.data;
  const reportData = responseData?.data || responseData;
  const dataSource = responseData?.dataSource || 'real';
  const generatedAt = responseData?.generatedAt;
  const debugInfo = responseData?.debugInfo;

  return {
    data: reportData,
    dataSource,
    generatedAt,
    debugInfo,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetch: () => {
      console.log("Manually refetching report data...");
      return queryResult.refetch();
    }
  };
}
