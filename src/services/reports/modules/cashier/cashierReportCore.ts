
import { CashierReport } from "@/types/reports";
import { handleReportError } from "../../utils/reportUtils";
import { createSampleCashierReport } from "../cashierReportUtils";
import { createReportResponse, ReportWithDataSource } from "../../utils/dataSourceUtils";
import { fetchCashierData } from "./cashierQueryManager";
import { processCashierReportData } from "./cashierDataProcessor";

export async function fetchCashierReport(
  storeId: string,
  from: string,
  to: string,
  useSampleData = false
): Promise<ReportWithDataSource<CashierReport> | null> {
  try {
    console.log('🔍 Fetching cashier report:', { storeId, from, to, useSampleData });

    if (useSampleData) {
      console.log('📊 Using sample data as requested');
      const sampleData = createSampleCashierReport();
      return createReportResponse(sampleData, 'sample', {
        fallbackReason: 'Explicitly requested sample data'
      });
    }

    // Fetch data using query manager
    const { transactions, shifts, queryAttempts, recordCount } = await fetchCashierData(storeId, from, to);

    // If no transaction data found, return empty report with debug info
    if (!transactions || transactions.length === 0) {
      console.info("ℹ️ No transaction data found after unified query attempts");
      const emptyReport: CashierReport = {
        cashierCount: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        averageTransactionTime: 0,
        cashiers: [],
        hourlyData: [],
        attendance: []
      };
      
      return createReportResponse(emptyReport, 'real', {
        queryAttempts,
        fallbackReason: 'No transactions found for date range after unified query attempts',
        recordCount: 0
      });
    }

    // Process the data using data processor
    const finalReport = await processCashierReportData(transactions, shifts || [], storeId);

    return createReportResponse(finalReport, 'real', {
      queryAttempts,
      recordCount: transactions?.length || 0
    });
  } catch (error) {
    console.error("❌ Cashier report generation error:", error);
    return handleReportError("Cashier Report", error);
  }
}
