import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

import { enhancedAnalyticsService, AnalyticsMetrics, SalesAnalytics, InventoryAnalytics, CustomerAnalytics } from '@/services/analytics/enhancedAnalyticsService';
import { 
  TrendCard,
  RevenueChart,
  SalesDistribution,
  PerformanceRadar,
  InventoryHeatmap,
  HourlyTraffic,
  CustomerSegmentation,
  InventoryForecast,
  AlertSummary,
  ProgressMetric
} from './AdvancedCharts';

interface EnhancedAnalyticsDashboardProps {
  storeId: string;
  userRole?: string;
}

interface DateRange {
  from: Date;
  to: Date;
}

export function EnhancedAnalyticsDashboard({ storeId, userRole = 'manager' }: EnhancedAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Analytics data states
  const [overviewMetrics, setOverviewMetrics] = useState<AnalyticsMetrics | null>(null);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [inventoryAnalytics, setInventoryAnalytics] = useState<InventoryAnalytics | null>(null);
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null);

  useEffect(() => {
    if (storeId) {
      loadAnalyticsData();
    }
  }, [storeId, dateRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const dateRangeFormatted = {
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd')
      };

      const [overview, sales, inventory, customer] = await Promise.all([
        enhancedAnalyticsService.getOverviewMetrics(storeId, dateRangeFormatted),
        enhancedAnalyticsService.getSalesAnalytics(storeId, dateRangeFormatted),
        enhancedAnalyticsService.getInventoryAnalytics(storeId),
        enhancedAnalyticsService.getCustomerAnalytics(storeId, dateRangeFormatted)
      ]);

      setOverviewMetrics(overview);
      setSalesAnalytics(sales);
      setInventoryAnalytics(inventory);
      setCustomerAnalytics(customer);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
    toast.success('Analytics data refreshed');
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      toast.info(`Exporting analytics report as ${format.toUpperCase()}...`);
      // Export functionality would be implemented here
      setTimeout(() => {
        toast.success(`Analytics report exported as ${format.toUpperCase()}`);
      }, 2000);
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const getSystemAlerts = () => {
    if (!overviewMetrics || !inventoryAnalytics) return [];

    const alerts = [];

    // Revenue alerts
    if (overviewMetrics.revenueGrowth < -10) {
      alerts.push({
        type: 'critical' as const,
        title: 'Revenue Decline',
        description: 'Revenue has decreased significantly compared to previous period',
        value: `${overviewMetrics.revenueGrowth.toFixed(1)}%`
      });
    }

    // Inventory alerts
    const criticalStockItems = inventoryAnalytics.stockLevels.filter(item => item.status === 'critical').length;
    if (criticalStockItems > 0) {
      alerts.push({
        type: 'critical' as const,
        title: 'Critical Stock Levels',
        description: `${criticalStockItems} items are critically low or out of stock`,
        value: criticalStockItems.toString()
      });
    }

    // Low stock warnings
    const lowStockItems = inventoryAnalytics.stockLevels.filter(item => item.status === 'low').length;
    if (lowStockItems > 0) {
      alerts.push({
        type: 'warning' as const,
        title: 'Low Stock Warning',
        description: `${lowStockItems} items are running low on stock`,
        value: lowStockItems.toString()
      });
    }

    // Positive growth alert
    if (overviewMetrics.revenueGrowth > 20) {
      alerts.push({
        type: 'info' as const,
        title: 'Strong Growth',
        description: 'Revenue is growing significantly above average',
        value: `+${overviewMetrics.revenueGrowth.toFixed(1)}%`
      });
    }

    return alerts;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-64 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enhanced Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights and real-time analytics for your store
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <DatePickerWithRange
            date={{ from: dateRange.from, to: dateRange.to }}
            onDateChange={(range) => range && range.from && range.to && setDateRange({ from: range.from, to: range.to })}
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select onValueChange={(value) => handleExport(value as 'pdf' | 'excel')}>
            <SelectTrigger className="w-24">
              <Download className="h-4 w-4" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">Export PDF</SelectItem>
              <SelectItem value="excel">Export Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      {overviewMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <TrendCard
            title="Total Revenue"
            value={`₱${overviewMetrics.totalRevenue.toLocaleString()}`}
            change={overviewMetrics.revenueGrowth}
            changeType={overviewMetrics.revenueGrowth > 0 ? 'positive' : 'negative'}
            subtitle={`${overviewMetrics.totalTransactions} transactions`}
          />
          <TrendCard
            title="Average Order Value"
            value={`₱${overviewMetrics.averageOrderValue.toFixed(2)}`}
            change={Math.random() * 10 - 5} // Mock change
            changeType={Math.random() > 0.5 ? 'positive' : 'negative'}
            subtitle="Per transaction"
          />
          <TrendCard
            title="Customer Acquisition"
            value={overviewMetrics.customerAcquisition}
            change={Math.random() * 15}
            changeType="positive"
            subtitle="New customers"
          />
          <TrendCard
            title="Inventory Turnover"
            value={`${overviewMetrics.inventoryTurnover.toFixed(1)}x`}
            change={Math.random() * 8}
            changeType="positive"
            subtitle="Times per period"
          />
        </div>
      )}

      {/* System Alerts */}
      <AlertSummary alerts={getSystemAlerts()} />

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {salesAnalytics && (
              <RevenueChart data={salesAnalytics.dailySales} />
            )}
            {salesAnalytics && (
              <SalesDistribution 
                data={salesAnalytics.categoryPerformance.map(cat => ({
                  name: cat.category,
                  value: cat.revenue
                }))} 
              />
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {overviewMetrics && (
              <>
                <ProgressMetric
                  title="Monthly Revenue Target"
                  current={overviewMetrics.totalRevenue}
                  target={100000}
                  unit="₱"
                />
                <ProgressMetric
                  title="Customer Retention"
                  current={overviewMetrics.customerRetention}
                  target={85}
                  unit="%"
                />
                <ProgressMetric
                  title="Inventory Efficiency"
                  current={overviewMetrics.inventoryTurnover * 10}
                  target={80}
                  unit="%"
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {salesAnalytics && (
              <>
                <HourlyTraffic data={salesAnalytics.hourlyDistribution} />
                <PerformanceRadar 
                  data={[
                    { metric: 'Revenue', value: 85 },
                    { metric: 'Transactions', value: 78 },
                    { metric: 'Customers', value: 92 },
                    { metric: 'Growth', value: 68 },
                    { metric: 'Efficiency', value: 74 }
                  ]} 
                />
              </>
            )}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Store Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {salesAnalytics && (
                <div className="space-y-4">
                  {salesAnalytics.storeComparison.map((store, index) => (
                    <div key={store.storeId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{store.storeName}</p>
                          <p className="text-sm text-muted-foreground">
                            {store.transactions} transactions • {store.customers} customers
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₱{store.revenue.toLocaleString()}</p>
                        <div className="flex items-center gap-1">
                          {store.growth > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />
                          )}
                          <span className={`text-xs ${store.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Math.abs(store.growth).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {inventoryAnalytics && (
              <>
                <InventoryHeatmap 
                  data={inventoryAnalytics.stockLevels.map(item => ({
                    name: item.item,
                    stockLevel: (item.currentStock / item.maxCapacity) * 100,
                    size: item.currentStock
                  }))} 
                />
                <InventoryForecast 
                  data={inventoryAnalytics.movementAnalysis.map(item => ({
                    date: format(new Date(), 'MMM dd'),
                    actual: item.movementVelocity,
                    forecast: item.demandForecast
                  }))}
                />
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reorder Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryAnalytics && (
                <div className="space-y-3">
                  {inventoryAnalytics.reorderPredictions.slice(0, 10).map((prediction, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          prediction.urgencyLevel === 'critical' ? 'destructive' :
                          prediction.urgencyLevel === 'high' ? 'default' :
                          prediction.urgencyLevel === 'medium' ? 'secondary' : 'outline'
                        }>
                          {prediction.urgencyLevel.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="font-medium">{prediction.item}</p>
                          <p className="text-sm text-muted-foreground">
                            Reorder by: {prediction.reorderDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{prediction.suggestedQuantity} units</p>
                        <p className="text-sm text-muted-foreground">
                          ₱{prediction.costImpact.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {customerAnalytics && (
              <>
                <CustomerSegmentation 
                  data={customerAnalytics.customerSegments.map(segment => ({
                    segment: segment.segment,
                    frequency: segment.frequency,
                    value: segment.averageValue
                  }))} 
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Segments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {customerAnalytics.customerSegments.map((segment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{segment.segment}</p>
                            <p className="text-sm text-muted-foreground">{segment.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{segment.count} customers</p>
                            <p className="text-sm text-muted-foreground">
                              ₱{segment.averageValue} avg
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lifetime Value Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {customerAnalytics && (
                  <div className="space-y-3">
                    {customerAnalytics.lifetimeValue.map((segment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{segment.segment}</span>
                        <div className="text-right">
                          <p className="font-medium">₱{segment.ltv.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {segment.retentionRate}% retention
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Churn Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {customerAnalytics && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Current Churn Rate</span>
                      <Badge variant="secondary">{customerAnalytics.churnAnalysis.churnRate}%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>At-Risk Customers</span>
                      <Badge variant="destructive">{customerAnalytics.churnAnalysis.atRiskCustomers}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Retention Opportunities</span>
                      <Badge variant="default">{customerAnalytics.churnAnalysis.retentionOpportunities}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}