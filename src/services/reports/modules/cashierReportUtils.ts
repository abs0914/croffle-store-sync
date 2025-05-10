
import { CashierReport } from "@/types/reports";

// Create sample user data for simulating cashiers when real data is not available
export function createSimulatedUsers(userIds: string[]) {
  const names = ["John Smith", "Maria Garcia", "David Chen", "Sarah Johnson", "Alex Wong", "Emily Brown"];
  const simulatedUsers: Record<string, { name: string, avatar?: string }> = {};
  
  userIds.forEach((id, index) => {
    simulatedUsers[id] = {
      name: names[index % names.length],
      avatar: index % 3 === 0 ? `https://ui-avatars.com/api/?name=${encodeURIComponent(names[index % names.length])}` : undefined
    };
  });
  
  return simulatedUsers;
}

// Initialize hourly data structure for a 24-hour period
export function initializeHourlyData() {
  const hourlyData: Record<string, { sales: number, transactions: number }> = {};
  
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    hourlyData[hour] = { sales: 0, transactions: 0 };
  }
  
  return hourlyData;
}

// Create sample cashier report data for demo purposes
export function createSampleCashierReport(): CashierReport {
  const cashiers = [
    {
      name: "John Smith",
      avatar: "https://ui-avatars.com/api/?name=John+Smith",
      transactionCount: 45,
      totalSales: 24650.75,
      averageTransactionValue: 547.79,
      averageTransactionTime: 2.3
    },
    {
      name: "Maria Garcia",
      avatar: "https://ui-avatars.com/api/?name=Maria+Garcia",
      transactionCount: 38,
      totalSales: 19825.50,
      averageTransactionValue: 521.72,
      averageTransactionTime: 1.8
    },
    {
      name: "David Chen",
      transactionCount: 42,
      totalSales: 22345.25,
      averageTransactionValue: 532.03,
      averageTransactionTime: 2.1
    }
  ];
  
  const totalTransactions = cashiers.reduce((sum, c) => sum + c.transactionCount, 0);
  const totalSales = cashiers.reduce((sum, c) => sum + c.totalSales, 0);
  
  const hourlyData = [
    { hour: "08:00", sales: 3250.50, transactions: 12 },
    { hour: "09:00", sales: 4125.75, transactions: 15 },
    { hour: "10:00", sales: 5680.25, transactions: 22 },
    { hour: "11:00", sales: 7890.50, transactions: 24 },
    { hour: "12:00", sales: 9350.00, transactions: 18 },
    { hour: "13:00", sales: 7250.50, transactions: 16 },
    { hour: "14:00", sales: 6125.25, transactions: 12 },
    { hour: "15:00", sales: 5340.00, transactions: 10 },
    { hour: "16:00", sales: 8700.75, transactions: 14 },
    { hour: "17:00", sales: 9760.00, transactions: 22 }
  ];
  
  return {
    cashierCount: cashiers.length,
    totalTransactions,
    averageTransactionValue: totalSales / totalTransactions,
    averageTransactionTime: 2.1,
    cashiers,
    hourlyData
  };
}
