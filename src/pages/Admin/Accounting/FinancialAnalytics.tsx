import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Percent, Target, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const profitabilityData = [
  { month: "Jul", grossProfit: 65000, netProfit: 28000, margin: 43.1 },
  { month: "Aug", grossProfit: 72000, netProfit: 32000, margin: 44.4 },
  { month: "Sep", grossProfit: 68000, netProfit: 29500, margin: 43.4 },
  { month: "Oct", grossProfit: 75000, netProfit: 35000, margin: 46.7 },
  { month: "Nov", grossProfit: 78000, netProfit: 38000, margin: 48.7 },
  { month: "Dec", grossProfit: 82000, netProfit: 42000, margin: 51.2 },
];

const cashFlowData = [
  { month: "Jul", operating: 45000, investing: -12000, financing: 8000 },
  { month: "Aug", operating: 52000, investing: -15000, financing: 5000 },
  { month: "Sep", operating: 48000, investing: -8000, financing: 12000 },
  { month: "Oct", operating: 55000, investing: -20000, financing: 15000 },
  { month: "Nov", operating: 58000, investing: -10000, financing: 8000 },
  { month: "Dec", operating: 62000, investing: -25000, financing: 20000 },
];

const expenseBreakdown = [
  { name: "Cost of Sales", value: 125000, color: "#8884d8" },
  { name: "Operating Expenses", value: 65000, color: "#82ca9d" },
  { name: "Marketing", value: 25000, color: "#ffc658" },
  { name: "Administrative", value: 35000, color: "#ff7300" },
  { name: "Other Expenses", value: 15000, color: "#00ff00" },
];

export function FinancialAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("6months");
  const [selectedStore, setSelectedStore] = useState("all");

  const kpis = [
    {
      title: "Gross Profit Margin",
      value: "51.2%",
      change: "+2.5%",
      trend: "up",
      target: "50%",
      description: "Revenue minus cost of goods sold"
    },
    {
      title: "Net Profit Margin", 
      value: "24.4%",
      change: "+1.8%",
      trend: "up",
      target: "20%",
      description: "Net income as percentage of revenue"
    },
    {
      title: "Current Ratio",
      value: "2.1",
      change: "-0.2",
      trend: "down", 
      target: "2.0",
      description: "Current assets divided by current liabilities"
    },
    {
      title: "ROI",
      value: "18.2%",
      change: "+3.1%", 
      trend: "up",
      target: "15%",
      description: "Return on investment"
    },
    {
      title: "Debt to Equity",
      value: "0.45",
      change: "-0.05",
      trend: "up",
      target: "0.5", 
      description: "Total debt divided by total equity"
    },
    {
      title: "Inventory Turnover",
      value: "8.5x",
      change: "+0.8x",
      trend: "up", 
      target: "8.0x",
      description: "Cost of goods sold divided by average inventory"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/accounting">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Accounting
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-croffle-text">Financial Analytics</h1>
          <p className="text-croffle-text/70">
            Advanced financial analysis and key performance indicators
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              <SelectItem value="main">Main Store</SelectItem>
              <SelectItem value="branch1">Branch 1</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <div className="flex items-center gap-1">
                  {kpi.trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-xs font-medium ${kpi.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {kpi.change}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-croffle-text">{kpi.value}</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-croffle-text/70">Target: {kpi.target}</span>
                  <Badge variant={parseFloat(kpi.value) >= parseFloat(kpi.target) ? "default" : "secondary"}>
                    <Target className="h-3 w-3 mr-1" />
                    {parseFloat(kpi.value) >= parseFloat(kpi.target) ? "Met" : "Below"}
                  </Badge>
                </div>
                <p className="text-xs text-croffle-text/60">{kpi.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="profitability" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="expenses">Expense Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="profitability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-croffle-accent" />
                Profitability Trend
              </CardTitle>
              <CardDescription>
                Gross profit, net profit, and margin analysis over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={profitabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="grossProfit" fill="#8884d8" name="Gross Profit (₱)" />
                  <Bar yAxisId="left" dataKey="netProfit" fill="#82ca9d" name="Net Profit (₱)" />
                  <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#ff7300" strokeWidth={3} name="Margin %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-croffle-accent" />
                Cash Flow Analysis
              </CardTitle>
              <CardDescription>
                Operating, investing, and financing activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="operating" stackId="a" fill="#8884d8" name="Operating" />
                  <Bar dataKey="investing" stackId="a" fill="#82ca9d" name="Investing" />
                  <Bar dataKey="financing" stackId="a" fill="#ffc658" name="Financing" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>
                  Current period expense distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Details</CardTitle>
                <CardDescription>
                  Detailed expense breakdown with percentages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expenseBreakdown.map((expense, index) => {
                    const total = expenseBreakdown.reduce((sum, item) => sum + item.value, 0);
                    const percentage = ((expense.value / total) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: expense.color }} />
                          <span className="text-sm font-medium">{expense.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">₱{expense.value.toLocaleString()}</div>
                          <div className="text-xs text-croffle-text/70">{percentage}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}