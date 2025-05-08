
import { CashierReport } from "@/types/reports";

// Helper function to create sample data for demo purposes
export function createSampleCashierReport(): CashierReport {
  return {
    cashierCount: 3,
    totalTransactions: 145,
    averageTransactionValue: 185.25,
    averageTransactionTime: 2.7,
    cashiers: [
      {
        name: "John Doe",
        avatar: "https://github.com/shadcn.png",
        transactionCount: 58,
        totalSales: 10946.50,
        averageTransactionValue: 188.73,
        averageTransactionTime: 2.3
      },
      {
        name: "Jane Smith",
        avatar: undefined,
        transactionCount: 52,
        totalSales: 9685.00,
        averageTransactionValue: 186.25,
        averageTransactionTime: 2.8
      },
      {
        name: "Alex Johnson",
        avatar: undefined,
        transactionCount: 35,
        totalSales: 6230.75,
        averageTransactionValue: 178.02,
        averageTransactionTime: 3.1
      }
    ],
    hourlyData: [
      { hour: "08:00", sales: 1250.50, transactions: 7 },
      { hour: "09:00", sales: 2350.75, transactions: 12 },
      { hour: "10:00", sales: 3125.25, transactions: 16 },
      { hour: "11:00", sales: 4010.00, transactions: 22 },
      { hour: "12:00", sales: 4550.50, transactions: 25 },
      { hour: "13:00", sales: 3850.75, transactions: 21 },
      { hour: "14:00", sales: 2780.25, transactions: 15 },
      { hour: "15:00", sales: 2150.50, transactions: 12 },
      { hour: "16:00", sales: 1875.75, transactions: 10 },
      { hour: "17:00", sales: 1550.00, transactions: 8 }
    ]
  };
}

// Utility function to simulate user data
export function createSimulatedUsers(userIds: string[]): Record<string, { name: string, avatar?: string }> {
  const simulatedUsers: Record<string, { name: string, avatar?: string }> = {};
  
  userIds.forEach((userId, index) => {
    const names = ['John Doe', 'Jane Smith', 'Alex Johnson'];
    simulatedUsers[userId] = {
      name: names[index % names.length] || `Cashier #${index + 1}`,
      avatar: index === 0 ? 'https://github.com/shadcn.png' : undefined
    };
  });
  
  return simulatedUsers;
}

// Initialize hour data for tracking hourly performance
export function initializeHourlyData(): Record<string, { sales: number, transactions: number }> {
  const hourlyData: Record<string, { sales: number, transactions: number }> = {};
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    hourlyData[hour] = { sales: 0, transactions: 0 };
  }
  return hourlyData;
}
