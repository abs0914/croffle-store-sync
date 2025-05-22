
import { CashierReport } from "@/types/reports";
import { format, subHours } from "date-fns";

// Initialize hourly data structure (00:00 to 23:00)
export function initializeHourlyData(): Record<string, { sales: number, transactions: number }> {
  const hourly: Record<string, { sales: number, transactions: number }> = {};
  
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, "0");
    hourly[hour] = { sales: 0, transactions: 0 };
  }
  
  return hourly;
}

// Create simulated users for sample data
export function createSimulatedUsers(userIds: string[] = []) {
  const mockCashiers = [
    { id: "1", name: "John Smith", avatar: "https://i.pravatar.cc/300?u=john" },
    { id: "2", name: "Sarah Lee", avatar: "https://i.pravatar.cc/300?u=sarah" },
    { id: "3", name: "Miguel Rodriguez", avatar: "https://i.pravatar.cc/300?u=miguel" },
    { id: "4", name: "Priya Patel", avatar: "https://i.pravatar.cc/300?u=priya" },
    { id: "5", name: "David Chen", avatar: "https://i.pravatar.cc/300?u=david" }
  ];
  
  if (userIds.length > 0) {
    return userIds.map((userId, index) => ({
      ...mockCashiers[index % mockCashiers.length],
      id: userId
    }));
  }
  
  return mockCashiers;
}

// Create sample cashier report data for demo purposes
export function createSampleCashierReport(): CashierReport {
  const mockCashiers = [
    { name: "John Smith", avatar: "https://i.pravatar.cc/300?u=john", transactionCount: 45, totalSales: 12500, averageTransactionValue: 277.78, averageTransactionTime: 3.2 },
    { name: "Sarah Lee", avatar: "https://i.pravatar.cc/300?u=sarah", transactionCount: 38, totalSales: 9800, averageTransactionValue: 257.89, averageTransactionTime: 2.8 },
    { name: "Miguel Rodriguez", avatar: "https://i.pravatar.cc/300?u=miguel", transactionCount: 25, totalSales: 7200, averageTransactionValue: 288.00, averageTransactionTime: 4.1 },
    { name: "Priya Patel", avatar: "https://i.pravatar.cc/300?u=priya", transactionCount: 30, totalSales: 8500, averageTransactionValue: 283.33, averageTransactionTime: 3.5 },
  ];
  
  const totalTransactions = mockCashiers.reduce((sum, c) => sum + c.transactionCount, 0);
  const totalSales = mockCashiers.reduce((sum, c) => sum + c.totalSales, 0);
  
  // Generate hourly data
  const hourlyData = [];
  const baseHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  
  for (const hour of baseHours) {
    const formattedHour = `${hour.toString().padStart(2, "0")}:00`;
    const transactions = Math.floor(Math.random() * 10) + 1;
    const sales = transactions * (Math.floor(Math.random() * 300) + 100);
    
    hourlyData.push({
      hour: formattedHour,
      transactions,
      sales
    });
  }
  
  // Generate sample attendance data
  const now = new Date();
  const attendance = [];
  
  for (const cashier of mockCashiers) {
    const startTime = format(subHours(now, Math.floor(Math.random() * 8) + 1), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    const endTime = Math.random() > 0.5 ? format(now, "yyyy-MM-dd'T'HH:mm:ss'Z'") : null;
    const startingCash = Math.floor(Math.random() * 1000) + 2000;
    const endingCash = endTime ? startingCash + Math.floor(Math.random() * 2000) : null;
    
    attendance.push({
      name: cashier.name,
      userId: `sample-${cashier.name.toLowerCase().replace(/\s/g, '-')}`,
      startTime,
      endTime,
      startPhoto: Math.random() > 0.3 ? "https://placehold.co/400x300?text=Cash+Drawer+Start" : null,
      endPhoto: endTime && Math.random() > 0.3 ? "https://placehold.co/400x300?text=Cash+Drawer+End" : null,
      startingCash,
      endingCash
    });
  }
  
  return {
    cashierCount: mockCashiers.length,
    totalTransactions,
    averageTransactionValue: totalSales / totalTransactions,
    averageTransactionTime: 3.4,
    cashiers: mockCashiers,
    hourlyData,
    attendance
  };
}
