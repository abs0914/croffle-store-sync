import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, TrendingUp, PieChart, FileText, Shield, Download, Calendar } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RechartsPie, Pie, Cell, BarChart as RechartsBar, Bar } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function EnhancedReportingSystem() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Mock data for demonstration
  const mockProfitLoss = {
    revenue: {
      gross_sales: 1250000,
      discounts: 125000,
      returns: 25000,
      net_sales: 1100000
    },
    cost_of_goods: {
      beginning_inventory: 150000,
      purchases: 450000,
      ending_inventory: 120000,
      total_cogs: 480000
    },
    gross_profit: 620000,
    operating_expenses: {
      salaries: 180000,
      rent: 50000,
      utilities: 25000,
      marketing: 35000,
      other: 40000,
      total: 330000
    },
    ebitda: 290000,
    depreciation: 15000,
    interest: 5000,
    tax: 81000,
    net_income: 189000,
    margins: {
      gross_margin: 56.4,
      operating_margin: 26.4,
      net_margin: 17.2
    }
  };

  const mockCostAnalysis = {
    product_costs: [
      {
        product_name: 'Classic Croffle',
        material_cost: 15.50,
        labor_cost: 8.25,
        overhead_cost: 3.75,
        total_cost: 27.50,
        selling_price: 85.00,
        margin: 67.6,
        volume: 1250,
        total_profit: 71875
      },
      {
        product_name: 'Chocolate Croffle',
        material_cost: 18.00,
        labor_cost: 8.25,
        overhead_cost: 3.75,
        total_cost: 30.00,
        selling_price: 95.00,
        margin: 68.4,
        volume: 980,
        total_profit: 63700
      }
    ],
    cost_breakdown: {
      materials: 425000,
      labor: 180000,
      overhead: 85000,
      total: 690000
    }
  };

  const mockBenchmarks = [
    {
      store_name: 'BGC Store',
      metrics: {
        revenue_per_sqft: 1250,
        revenue_per_employee: 125000,
        transactions_per_day: 85,
        average_order_value: 275,
        gross_margin: 62.5
      },
      ranking: { overall_rank: 1, revenue_rank: 1 }
    },
    {
      store_name: 'Makati Store',
      metrics: {
        revenue_per_sqft: 1180,
        revenue_per_employee: 118000,
        transactions_per_day: 78,
        average_order_value: 260,
        gross_margin: 59.8
      },
      ranking: { overall_rank: 2, revenue_rank: 2 }
    }
  ];

  const mockComplianceReport = {
    bir_compliance: {
      sales_reported: 1250000,
      tax_collected: 150000,
      penalties: 0,
      filing_status: 'compliant' as const
    },
    food_safety: {
      inspection_date: '2024-01-15',
      score: 95,
      violations: [],
      corrective_actions: []
    },
    labor_compliance: {
      employee_count: 15,
      overtime_hours: 120,
      minimum_wage_compliance: true,
      benefits_compliance: true
    }
  };

  const mockExecutiveDashboard = {
    kpis: {
      total_revenue: 2450000,
      revenue_growth: 18.5,
      net_profit: 420000,
      profit_margin: 17.1,
      customer_count: 1250,
      customer_growth: 12.5,
      average_order_value: 275,
      aov_growth: 8.3
    },
    alerts: [
      {
        type: 'inventory' as const,
        severity: 'medium' as const,
        message: 'Low stock alert: 5 items below minimum threshold',
        action_required: true
      },
      {
        type: 'compliance' as const,
        severity: 'low' as const,
        message: 'Monthly tax filing due in 3 days',
        action_required: true
      }
    ],
    top_performers: {
      stores: [
        { name: 'BGC Store', revenue: 450000, growth: 25.3 },
        { name: 'Makati Store', revenue: 425000, growth: 18.7 }
      ],
      products: [
        { name: 'Classic Croffle', revenue: 125000, margin: 65.2 },
        { name: 'Chocolate Croffle', revenue: 98000, margin: 62.8 }
      ]
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'delayed': return 'text-yellow-600';
      case 'non_compliant': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-blue-600" />
                Enhanced Reporting & Analytics
              </CardTitle>
              <CardDescription>
                Production-ready business intelligence with P&L statements, cost analysis, and executive dashboards
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Shield className="h-3 w-3 mr-1" />
                Enterprise Ready
              </Badge>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="executive" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="executive">Executive Dashboard</TabsTrigger>
          <TabsTrigger value="profit-loss">P&L Statement</TabsTrigger>
          <TabsTrigger value="cost-analysis">Cost Analysis</TabsTrigger>
          <TabsTrigger value="benchmarks">Performance Benchmarks</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
        </TabsList>

        {/* Executive Dashboard */}
        <TabsContent value="executive" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(mockExecutiveDashboard.kpis.total_revenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +{mockExecutiveDashboard.kpis.revenue_growth}% vs last period
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(mockExecutiveDashboard.kpis.net_profit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mockExecutiveDashboard.kpis.profit_margin}% profit margin
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Customer Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  +{mockExecutiveDashboard.kpis.customer_growth}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {mockExecutiveDashboard.kpis.customer_count.toLocaleString()} total customers
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(mockExecutiveDashboard.kpis.average_order_value)}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{mockExecutiveDashboard.kpis.aov_growth}% growth
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Critical Alerts</CardTitle>
                <CardDescription>Items requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockExecutiveDashboard.alerts.map((alert, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={alert.severity === 'medium' ? 'default' : 'secondary'}>
                        {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                      </Badge>
                      <Badge variant="outline" className={alert.action_required ? 'border-red-200 text-red-700' : ''}>
                        {alert.action_required ? 'Action Required' : 'Info'}
                      </Badge>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Performing Stores</CardTitle>
                <CardDescription>Revenue and growth leaders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockExecutiveDashboard.top_performers.stores.map((store, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{store.name}</span>
                        <p className="text-xs text-muted-foreground">+{store.growth}% growth</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(store.revenue)}</span>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* P&L Statement */}
        <TabsContent value="profit-loss" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profit & Loss Statement</CardTitle>
              <CardDescription>Comprehensive financial performance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Revenue</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Gross Sales</span>
                        <span className="font-medium">{formatCurrency(mockProfitLoss.revenue.gross_sales)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Less: Discounts</span>
                        <span>({formatCurrency(mockProfitLoss.revenue.discounts)})</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Less: Returns</span>
                        <span>({formatCurrency(mockProfitLoss.revenue.returns)})</span>
                      </div>
                      <hr />
                      <div className="flex justify-between font-medium">
                        <span>Net Sales</span>
                        <span>{formatCurrency(mockProfitLoss.revenue.net_sales)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Cost of Goods Sold</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Beginning Inventory</span>
                        <span>{formatCurrency(mockProfitLoss.cost_of_goods.beginning_inventory)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Purchases</span>
                        <span>{formatCurrency(mockProfitLoss.cost_of_goods.purchases)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Less: Ending Inventory</span>
                        <span>({formatCurrency(mockProfitLoss.cost_of_goods.ending_inventory)})</span>
                      </div>
                      <hr />
                      <div className="flex justify-between font-medium">
                        <span>Total COGS</span>
                        <span>{formatCurrency(mockProfitLoss.cost_of_goods.total_cogs)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Operating Expenses</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Salaries</span>
                        <span>{formatCurrency(mockProfitLoss.operating_expenses.salaries)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rent</span>
                        <span>{formatCurrency(mockProfitLoss.operating_expenses.rent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Utilities</span>
                        <span>{formatCurrency(mockProfitLoss.operating_expenses.utilities)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Marketing</span>
                        <span>{formatCurrency(mockProfitLoss.operating_expenses.marketing)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other</span>
                        <span>{formatCurrency(mockProfitLoss.operating_expenses.other)}</span>
                      </div>
                      <hr />
                      <div className="flex justify-between font-medium">
                        <span>Total Operating Expenses</span>
                        <span>{formatCurrency(mockProfitLoss.operating_expenses.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-3">Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Gross Profit</span>
                        <span className="font-medium">{formatCurrency(mockProfitLoss.gross_profit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>EBITDA</span>
                        <span className="font-medium">{formatCurrency(mockProfitLoss.ebitda)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Depreciation</span>
                        <span>({formatCurrency(mockProfitLoss.depreciation)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Interest</span>
                        <span>({formatCurrency(mockProfitLoss.interest)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>({formatCurrency(mockProfitLoss.tax)})</span>
                      </div>
                      <hr />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Net Income</span>
                        <span className="text-green-600">{formatCurrency(mockProfitLoss.net_income)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{mockProfitLoss.margins.gross_margin}%</div>
                  <p className="text-sm text-muted-foreground">Gross Margin</p>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{mockProfitLoss.margins.operating_margin}%</div>
                  <p className="text-sm text-muted-foreground">Operating Margin</p>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{mockProfitLoss.margins.net_margin}%</div>
                  <p className="text-sm text-muted-foreground">Net Margin</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Analysis */}
        <TabsContent value="cost-analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product Cost Breakdown</CardTitle>
                <CardDescription>Material, labor, and overhead analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie>
                    <Pie
                      data={[
                        { name: 'Materials', value: mockCostAnalysis.cost_breakdown.materials, fill: '#0088FE' },
                        { name: 'Labor', value: mockCostAnalysis.cost_breakdown.labor, fill: '#00C49F' },
                        { name: 'Overhead', value: mockCostAnalysis.cost_breakdown.overhead, fill: '#FFBB28' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product Profitability</CardTitle>
                <CardDescription>Top performing products by margin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockCostAnalysis.product_costs.map((product, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{product.product_name}</span>
                        <Badge variant="outline">{product.margin.toFixed(1)}% margin</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Cost: {formatCurrency(product.total_cost)}</p>
                          <p className="text-muted-foreground">Volume: {product.volume}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Price: {formatCurrency(product.selling_price)}</p>
                          <p className="font-medium text-green-600">Profit: {formatCurrency(product.total_profit)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Benchmarks */}
        <TabsContent value="benchmarks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Store Performance Benchmarks</CardTitle>
              <CardDescription>Comparative analysis across all locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockBenchmarks.map((store, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{store.store_name}</h4>
                      <Badge variant="outline">#{store.ranking.overall_rank} Overall</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(store.metrics.revenue_per_sqft)}
                        </div>
                        <p className="text-xs text-muted-foreground">Revenue/sq ft</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(store.metrics.revenue_per_employee)}
                        </div>
                        <p className="text-xs text-muted-foreground">Revenue/employee</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {store.metrics.transactions_per_day}
                        </div>
                        <p className="text-xs text-muted-foreground">Transactions/day</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-600">
                          {formatCurrency(store.metrics.average_order_value)}
                        </div>
                        <p className="text-xs text-muted-foreground">Avg order value</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">
                          {store.metrics.gross_margin.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Gross margin</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Reports */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">BIR Compliance</CardTitle>
                <CardDescription>Tax filing and regulatory compliance status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">{formatCurrency(mockComplianceReport.bir_compliance.sales_reported)}</div>
                    <p className="text-xs text-muted-foreground">Sales Reported</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{formatCurrency(mockComplianceReport.bir_compliance.tax_collected)}</div>
                    <p className="text-xs text-muted-foreground">Tax Collected</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Filing Status</span>
                  <Badge variant="outline" className={`${getComplianceColor(mockComplianceReport.bir_compliance.filing_status)} border-current`}>
                    {mockComplianceReport.bir_compliance.filing_status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Penalties</span>
                  <span className="font-medium text-green-600">
                    {mockComplianceReport.bir_compliance.penalties === 0 ? 'None' : formatCurrency(mockComplianceReport.bir_compliance.penalties)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Food Safety & Labor Compliance</CardTitle>
                <CardDescription>Health and safety regulatory status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Food Safety Score</span>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {mockComplianceReport.food_safety.score}/100
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last inspection: {mockComplianceReport.food_safety.inspection_date}
                  </p>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Employee Count</span>
                    <span>{mockComplianceReport.labor_compliance.employee_count}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Overtime Hours</span>
                    <span>{mockComplianceReport.labor_compliance.overtime_hours}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Compliance Status</span>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      Compliant
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}