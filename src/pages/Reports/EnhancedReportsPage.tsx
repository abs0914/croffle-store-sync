import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { 
  BarChart3, 
  Download, 
  RefreshCw, 
  Calendar,
  TrendingUp,
  FileText,
  PieChart,
  Target,
  Zap,
  Brain,
  Filter,
  Package
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

import { useStore } from '@/contexts/StoreContext';
import { EnhancedAnalyticsDashboard } from '@/components/analytics/EnhancedAnalyticsDashboard';
import { enhancedReportService, ComprehensiveReport } from '@/services/reports/enhancedReportService';

interface DateRange {
  from: Date;
  to: Date;
}

export default function EnhancedReportsPage() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState('analytics');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [reportType, setReportType] = useState<'comprehensive' | 'sales' | 'inventory' | 'customers' | 'predictive'>('comprehensive');
  const [isGenerating, setIsGenerating] = useState(false);
  const [comprehensiveReport, setComprehensiveReport] = useState<ComprehensiveReport | null>(null);

  const handleGenerateReport = async (type: 'pdf' | 'excel') => {
    if (!currentStore) {
      toast.error('Please select a store first');
      return;
    }

    setIsGenerating(true);
    try {
      const dateRangeFormatted = {
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd')
      };

      // Generate comprehensive report data
      const reportData = await enhancedReportService.generateComprehensiveReport(
        currentStore.id,
        dateRangeFormatted
      );

      // Prepare export options based on report type
      let exportOptions;
      
      switch (reportType) {
        case 'sales':
          exportOptions = {
            title: 'Sales Analysis Report',
            dateRange: dateRangeFormatted,
            storeId: currentStore.id,
            storeName: currentStore.name,
            data: reportData.sales.dailyTrends,
            columns: [
              { key: 'date', label: 'Date', type: 'date' as const },
              { key: 'revenue', label: 'Revenue', type: 'currency' as const },
              { key: 'transactions', label: 'Transactions', type: 'number' as const }
            ],
            summary: {
              title: 'Sales Summary',
              metrics: [
                { label: 'Total Revenue', value: reportData.overview.totalRevenue, type: 'currency' as const },
                { label: 'Total Transactions', value: reportData.overview.totalTransactions, type: 'number' as const },
                { label: 'Average Order Value', value: reportData.overview.averageOrderValue, type: 'currency' as const },
                { label: 'Growth Rate', value: reportData.overview.growthRate, type: 'percentage' as const }
              ]
            }
          };
          break;

        case 'inventory':
          exportOptions = {
            title: 'Inventory Analysis Report',
            dateRange: dateRangeFormatted,
            storeId: currentStore.id,
            storeName: currentStore.name,
            data: reportData.inventory.stockLevels,
            columns: [
              { key: 'item', label: 'Item', type: 'text' as const },
              { key: 'currentStock', label: 'Current Stock', type: 'number' as const },
              { key: 'minThreshold', label: 'Min Threshold', type: 'number' as const },
              { key: 'status', label: 'Status', type: 'text' as const },
              { key: 'value', label: 'Value', type: 'currency' as const }
            ],
            summary: {
              title: 'Inventory Summary',
              metrics: [
                { label: 'Total Items', value: reportData.inventory.movementSummary.totalItems, type: 'number' as const },
                { label: 'Low Stock Items', value: reportData.inventory.movementSummary.lowStockItems, type: 'number' as const },
                { label: 'Out of Stock Items', value: reportData.inventory.movementSummary.outOfStockItems, type: 'number' as const },
                { label: 'Total Inventory Value', value: reportData.inventory.movementSummary.totalValue, type: 'currency' as const }
              ]
            }
          };
          break;

        case 'customers':
          exportOptions = {
            title: 'Customer Analysis Report',
            dateRange: dateRangeFormatted,
            storeId: currentStore.id,
            storeName: currentStore.name,
            data: reportData.customers.segments,
            columns: [
              { key: 'segment', label: 'Segment', type: 'text' as const },
              { key: 'count', label: 'Count', type: 'number' as const },
              { key: 'revenue', label: 'Revenue', type: 'currency' as const },
              { key: 'averageValue', label: 'Average Value', type: 'currency' as const }
            ],
            summary: {
              title: 'Customer Summary',
              metrics: [
                { label: 'Retention Rate', value: reportData.customers.retention.rate, type: 'percentage' as const },
                { label: 'New Customers', value: reportData.customers.retention.newCustomers, type: 'number' as const },
                { label: 'Returning Customers', value: reportData.customers.retention.returningCustomers, type: 'number' as const }
              ]
            }
          };
          break;

        default:
          // Comprehensive report
          exportOptions = {
            title: 'Comprehensive Business Report',
            dateRange: dateRangeFormatted,
            storeId: currentStore.id,
            storeName: currentStore.name,
            data: [
              ...reportData.sales.dailyTrends.map(d => ({ ...d, type: 'Sales' })),
              ...reportData.inventory.stockLevels.slice(0, 10).map(i => ({ ...i, type: 'Inventory' }))
            ],
            columns: [
              { key: 'type', label: 'Type', type: 'text' as const },
              { key: 'date', label: 'Date/Item', type: 'text' as const },
              { key: 'revenue', label: 'Revenue/Value', type: 'currency' as const },
              { key: 'transactions', label: 'Transactions/Stock', type: 'number' as const }
            ],
            summary: {
              title: 'Business Overview',
              metrics: [
                { label: 'Total Revenue', value: reportData.overview.totalRevenue, type: 'currency' as const },
                { label: 'Total Transactions', value: reportData.overview.totalTransactions, type: 'number' as const },
                { label: 'Growth Rate', value: reportData.overview.growthRate, type: 'percentage' as const },
                { label: 'Inventory Value', value: reportData.inventory.movementSummary.totalValue, type: 'currency' as const }
              ]
            }
          };
      }

      // Export the report
      if (type === 'pdf') {
        await enhancedReportService.exportToPDF(exportOptions);
        toast.success('PDF report generated successfully');
      } else {
        await enhancedReportService.exportToExcel(exportOptions);
        toast.success('Excel report generated successfully');
      }

      setComprehensiveReport(reportData);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePredictiveReport = async () => {
    if (!currentStore) {
      toast.error('Please select a store first');
      return;
    }

    setIsGenerating(true);
    try {
      const predictions = await enhancedReportService.generatePredictiveReport(currentStore.id);
      
      // Create a predictive report export
      const exportOptions = {
        title: 'Predictive Analytics Report',
        dateRange: {
          from: format(new Date(), 'yyyy-MM-dd'),
          to: format(subDays(new Date(), -30), 'yyyy-MM-dd') // Next 30 days
        },
        storeId: currentStore.id,
        storeName: currentStore.name,
        data: predictions.sales.nextMonth,
        columns: [
          { key: 'date', label: 'Date', type: 'date' as const },
          { key: 'predicted', label: 'Predicted Revenue', type: 'currency' as const }
        ],
        summary: {
          title: 'Predictions Summary',
          metrics: [
            { label: 'Sales Trend', value: predictions.sales.trend, type: 'text' as const },
            { label: 'Confidence Level', value: `${(predictions.sales.confidence * 100).toFixed(0)}%`, type: 'text' as const },
            { label: 'Growth Opportunities', value: predictions.customers.growthOpportunities, type: 'number' as const },
            { label: 'Expected New Customers', value: predictions.customers.expectedNewCustomers, type: 'number' as const }
          ]
        }
      };

      await enhancedReportService.exportToPDF(exportOptions);
      toast.success('Predictive report generated successfully');
    } catch (error) {
      console.error('Error generating predictive report:', error);
      toast.error('Failed to generate predictive report');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!currentStore) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Please select a store to view enhanced reports and analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Advanced reporting, predictive analytics, and business intelligence for {currentStore.name}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <DatePickerWithRange
            date={{ from: dateRange.from, to: dateRange.to }}
            onDateChange={(range) => range && range.from && range.to && setDateRange({ from: range.from, to: range.to })}
          />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Live Analytics
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Custom Reports
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Predictive Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <EnhancedAnalyticsDashboard storeId={currentStore.id} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Report Generation Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generate Custom Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Report Type</label>
                  <Select value={reportType} onValueChange={(value) => setReportType(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                      <SelectItem value="sales">Sales Analysis</SelectItem>
                      <SelectItem value="inventory">Inventory Analysis</SelectItem>
                      <SelectItem value="customers">Customer Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end gap-2">
                  <Button 
                    onClick={() => handleGenerateReport('pdf')}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Export PDF'}
                  </Button>
                </div>
                
                <div className="flex items-end gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => handleGenerateReport('excel')}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Export Excel'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Sales Performance</h3>
                    <p className="text-sm text-muted-foreground">Revenue trends and analysis</p>
                  </div>
                </div>
                <Badge variant="secondary">Popular</Badge>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <PieChart className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Inventory Overview</h3>
                    <p className="text-sm text-muted-foreground">Stock levels and movements</p>
                  </div>
                </div>
                <Badge variant="outline">Essential</Badge>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Target className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Customer Insights</h3>
                    <p className="text-sm text-muted-foreground">Behavior and segmentation</p>
                  </div>
                </div>
                <Badge variant="secondary">Detailed</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Daily Sales Report', date: format(new Date(), 'MMM dd, yyyy'), type: 'PDF' },
                  { name: 'Inventory Analysis', date: format(subDays(new Date(), 1), 'MMM dd, yyyy'), type: 'Excel' },
                  { name: 'Customer Segmentation', date: format(subDays(new Date(), 2), 'MMM dd, yyyy'), type: 'PDF' }
                ].map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">Generated on {report.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{report.type}</Badge>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          {/* Predictive Analytics Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Generate AI-powered forecasts and predictions for your business
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>• Sales forecasting</span>
                    <span>• Inventory predictions</span>
                    <span>• Customer behavior analysis</span>
                  </div>
                </div>
                <Button 
                  onClick={handleGeneratePredictiveReport}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Generate Predictions'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Prediction Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold">Sales Forecasting</h3>
                    <p className="text-sm text-muted-foreground">Next 30 days revenue prediction</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Confidence:</span>
                    <Badge variant="default">High (85%)</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Trend:</span>
                    <span className="text-sm text-green-600">↗ Increasing</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="h-8 w-8 text-orange-600" />
                  <div>
                    <h3 className="font-semibold">Inventory Optimization</h3>
                    <p className="text-sm text-muted-foreground">Smart reordering suggestions</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Items to reorder:</span>
                    <Badge variant="secondary">12</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Potential savings:</span>
                    <span className="text-sm text-green-600">₱2,500</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">Customer Insights</h3>
                    <p className="text-sm text-muted-foreground">Behavior pattern analysis</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Churn risk:</span>
                    <Badge variant="outline">Low (8%)</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Growth potential:</span>
                    <span className="text-sm text-blue-600">+15 customers</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-800">Revenue Opportunity</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Your evening sales show 23% growth potential. Consider extending hours or promoting dinner specials.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">💡</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-800">Inventory Optimization</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Product A is overstocked while Product B frequently runs out. Adjust ordering ratios for better efficiency.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">👥</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-purple-800">Customer Retention</h4>
                      <p className="text-sm text-purple-700 mt-1">
                        5 customers haven't visited in 30 days. Consider a personalized re-engagement campaign.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}