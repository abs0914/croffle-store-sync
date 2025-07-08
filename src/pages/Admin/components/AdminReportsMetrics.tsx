import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ShoppingCart, Users, TrendingUp, Package, AlertTriangle } from 'lucide-react';

interface ReportMetrics {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topPerformingStore: string;
  growthRate: number;
  totalCustomers?: number;
  totalProducts?: number;
  lowStockItems?: number;
}

interface AdminReportsMetricsProps {
  metrics: ReportMetrics;
  reportType: 'sales' | 'customers' | 'expenses';
}

export const AdminReportsMetrics: React.FC<AdminReportsMetricsProps> = ({
  metrics,
  reportType
}) => {
  const getMetricCards = () => {
    switch (reportType) {
      case 'sales':
        return [
          {
            title: 'Total Revenue',
            value: `₱${metrics.totalRevenue.toFixed(2)}`,
            icon: DollarSign,
            color: 'text-green-600'
          },
          {
            title: 'Total Transactions',
            value: metrics.totalTransactions.toLocaleString(),
            icon: ShoppingCart,
            color: 'text-blue-600'
          },
          {
            title: 'Average Order Value',
            value: `₱${metrics.averageOrderValue.toFixed(2)}`,
            icon: TrendingUp,
            color: 'text-purple-600'
          },
          {
            title: 'Top Performing Store',
            value: metrics.topPerformingStore || 'N/A',
            icon: Users,
            color: 'text-orange-600'
          }
        ];

      case 'customers':
        return [
          {
            title: 'Total Customers',
            value: (metrics.totalCustomers || 0).toLocaleString(),
            icon: Users,
            color: 'text-blue-600'
          },
          {
            title: 'Total Lifetime Value',
            value: `₱${metrics.totalRevenue.toFixed(2)}`,
            icon: DollarSign,
            color: 'text-green-600'
          },
          {
            title: 'Average Customer Value',
            value: `₱${metrics.averageOrderValue.toFixed(2)}`,
            icon: TrendingUp,
            color: 'text-purple-600'
          },
          {
            title: 'Top Store by Customers',
            value: metrics.topPerformingStore || 'N/A',
            icon: Users,
            color: 'text-orange-600'
          }
        ];

      case 'expenses':
        return [
          {
            title: 'Total Expenses',
            value: `₱${metrics.totalRevenue.toFixed(2)}`,
            icon: DollarSign,
            color: 'text-red-600'
          },
          {
            title: 'Total Expense Items',
            value: metrics.totalTransactions.toLocaleString(),
            icon: ShoppingCart,
            color: 'text-blue-600'
          },
          {
            title: 'Average Expense',
            value: `₱${(metrics.totalRevenue / Math.max(metrics.totalTransactions, 1)).toFixed(2)}`,
            icon: TrendingUp,
            color: 'text-purple-600'
          },
          {
            title: 'Top Store by Expenses',
            value: metrics.topPerformingStore || 'N/A',
            icon: Users,
            color: 'text-orange-600'
          }
        ];

      default:
        return [];
    }
  };

  const metricCards = getMetricCards();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
            <metric.icon className={`h-4 w-4 ${metric.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            {index === 2 && (
              <div className="flex items-center pt-1">
                <Badge 
                  variant={metrics.growthRate >= 0 ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {metrics.growthRate >= 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}% growth
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};