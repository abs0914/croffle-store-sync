
import { CashierReport } from "@/types/reports";
import { processCashierTransactions } from "./cashierTransactionProcessor";
import { processAttendanceData } from "./cashierAttendanceProcessor";

export async function processCashierReportData(
  transactions: any[],
  shifts: any[],
  storeId: string
): Promise<CashierReport> {
  console.log(`⚙️ Processing ${transactions.length} transactions...`);
  const { cashierData, hourlyDataArray } = await processCashierTransactions(transactions, storeId);

  console.log('⚙️ Processing attendance data...');
  const attendanceData = await processAttendanceData(shifts, cashierData);

  // Calculate totals
  const cashiers = Object.values(cashierData).map(c => {
    const avgTxValue = c.transactionCount > 0 ? c.totalSales / c.transactionCount : 0;
    const avgTxTime = c.transactionTimes.length > 0
      ? c.transactionTimes.reduce((sum, time) => sum + time, 0) / c.transactionTimes.length
      : 2.5; // Default value if no transactions

    // Generate avatar from name if available
    const avatar = c.name
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}`
      : undefined;

    return {
      name: c.name || "Unknown Cashier",
      avatar,
      transactionCount: c.transactionCount,
      totalSales: c.totalSales,
      averageTransactionValue: avgTxValue,
      averageTransactionTime: avgTxTime
    };
  }).sort((a, b) => b.totalSales - a.totalSales);

  // Calculate final statistics
  const totalTransactions = Object.values(cashierData).reduce((sum, c) => sum + c.transactionCount, 0);
  const totalSales = Object.values(cashierData).reduce((sum, c) => sum + c.totalSales, 0);
  const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
  const avgTransactionTime = cashiers.length > 0
    ? cashiers.reduce((sum, c) => sum + c.averageTransactionTime, 0) / cashiers.length
    : 0;

  console.log('📈 Cashier report generated successfully:', {
    cashierCount: cashiers.length,
    totalTransactions,
    totalSales: totalSales.toFixed(2),
    cashierNames: cashiers.map(c => c.name),
    dataFound: transactions.length > 0
  });

  return {
    cashierCount: cashiers.length,
    totalTransactions,
    averageTransactionValue,
    averageTransactionTime: avgTransactionTime,
    cashiers,
    hourlyData: hourlyDataArray,
    attendance: attendanceData
  };
}
