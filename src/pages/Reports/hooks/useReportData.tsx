
import { useQuery } from "@tanstack/react-query";
import { ReportType } from "..";
import { 
  fetchSalesReport, 
  fetchInventoryReport, 
  fetchProfitLossReport, 
  fetchStockReport,
  fetchCashierReport 
} from "@/services/reports";
import { formatCurrency } from "@/utils/format";

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
        let result = null;
        let isSampleData = false;
        
        switch (reportType) {
          case 'sales':
            result = await fetchSalesReport(storeId, from, to);
            // Check if this is sample data
            isSampleData = result && result.salesByDate?.length > 0 && 
                          result.salesByDate.every(d => d.amount % 10 === 0);
            
            // Format currency values
            if (result) {
              result.totalSales = parseFloat(result.totalSales);
              if (result.topProducts) {
                result.topProducts.forEach(product => {
                  product.revenue = parseFloat(product.revenue.toString());
                });
              }
              if (result.paymentMethods) {
                result.paymentMethods.forEach(method => {
                  method.amount = parseFloat(method.amount.toString());
                });
              }
            }
            break;
          case 'inventory':
            result = await fetchInventoryReport(storeId, from, to);
            // Check for sample data markers
            isSampleData = result && result.inventoryItems?.length > 0 && 
                          result.inventoryItems.every(item => item.soldUnits % 5 === 0);
            break;
          case 'profit_loss':
            result = await fetchProfitLossReport(storeId, from, to);
            // Check for sample data markers
            isSampleData = result && result.profitByDate?.length > 0 &&
                          result.profitByDate.every(d => d.profit % 5 === 0);
            
            // Format currency values
            if (result) {
              result.totalRevenue = parseFloat(result.totalRevenue.toString());
              result.costOfGoods = parseFloat(result.costOfGoods.toString());
              result.grossProfit = parseFloat(result.grossProfit.toString());
              result.expenses = parseFloat(result.expenses.toString());
              result.netProfit = parseFloat(result.netProfit.toString());
            }
            break;
          case 'stock':
            result = await fetchStockReport(storeId, from, to);
            isSampleData = result && result.stockItems?.length > 0 &&
                          result.stockItems.every(item => item.initialStock % 10 === 0);
            break;
          case 'cashier':
            result = await fetchCashierReport(storeId, from, to);
            isSampleData = result && result.cashiers?.length > 0 && 
                          result.cashiers.every(c => c.transactionCount % 5 === 0);
            break;
          default:
            result = Promise.resolve(null);
            break;
        }

        return { data: result, isSampleData };
      } catch (error) {
        console.error(`Error fetching ${reportType} report:`, error);
        throw error;
      }
    },
    enabled: !!storeId && !!from && !!to && 
            ['sales', 'inventory', 'profit_loss', 'stock', 'cashier'].includes(reportType),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false
  });

  return {
    data: queryResult.data?.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    isSampleData: queryResult.data?.isSampleData || false,
    refetch: () => {
      console.log("Manually refetching report data...");
      return queryResult.refetch();
    }
  };
}
