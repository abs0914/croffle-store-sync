
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, FileText, TrendingUp, Users, Building2 } from 'lucide-react';
import { expenseService } from '@/services/expense/expenseService';
import { DateRange } from 'react-day-picker';
import { format, startOfYear, endOfYear } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function AdminExpenseAdvancedReports() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfYear(new Date()),
    to: endOfYear(new Date())
  });
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'budget'>('summary');

  const { data: stats } = useQuery({
    queryKey: ['admin-expense-stats', selectedStore, dateRange],
    queryFn: () => expenseService.getExpenseStats(selectedStore === 'all' ? undefined : selectedStore)
  });

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data } = await import('@/integrations/supabase/client').then(m => 
        m.supabase.from('stores').select('id, name').eq('is_active', true)
      );
      return data || [];
    }
  });

  const { data: expenses } = useQuery({
    queryKey: ['admin-expenses', selectedStore, dateRange],
    queryFn: () => expenseService.getExpenses(selectedStore === 'all' ? undefined : selectedStore)
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const exportToExcel = () => {
    if (!expenses?.length) {
      return;
    }

    // Create comprehensive Excel data
    const headers = [
      'Date', 'Store', 'Category', 'Description', 'Amount', 
      'Status', 'Created By', 'Approved By', 'Receipt'
    ];
    
    const csvData = expenses.map(expense => [
      format(new Date(expense.expense_date), 'yyyy-MM-dd'),
      expense.store_name || 'Unknown',
      expense.category?.name || 'Unknown',
      expense.description,
      expense.amount.toString(),
      expense.status,
      expense.created_by_name || 'Unknown',
      expense.approved_by_name || 'N/A',
      expense.receipt_url ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expense-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // In a real implementation, you would generate a PDF report
    console.log('PDF export functionality would be implemented here');
  };

  // Calculate advanced metrics
  const storeComparison = stores?.map(store => {
    const storeExpenses = expenses?.filter(exp => exp.store_id === store.id) || [];
    const totalAmount = storeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgExpense = storeExpenses.length > 0 ? totalAmount / storeExpenses.length : 0;
    
    return {
      store: store.name,
      totalAmount,
      avgExpense,
      count: storeExpenses.length,
      pendingCount: storeExpenses.filter(exp => exp.status === 'pending').length
    };
  }) || [];

  const monthlyTrend = stats?.monthly_trend || [];
  const categoryBreakdown = stats?.category_breakdown || [];

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Advanced Expense Analytics
          </CardTitle>
          <CardDescription>
            Comprehensive expense analysis and reporting tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Date Range</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Store</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores?.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType as any}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="detailed">Detailed Analysis</SelectItem>
                  <SelectItem value="budget">Budget Comparison</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={exportToExcel} variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button onClick={exportToPDF} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Network Spend</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(storeComparison.reduce((sum, store) => sum + store.totalAmount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {stores?.length || 0} stores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average per Store</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                storeComparison.length > 0 
                  ? storeComparison.reduce((sum, store) => sum + store.totalAmount, 0) / storeComparison.length 
                  : 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Monthly average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storeComparison.reduce((sum, store) => sum + store.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Expense entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storeComparison.reduce((sum, store) => sum + store.pendingCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Store Performance Comparison</CardTitle>
            <CardDescription>Expense totals by store location</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storeComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="store" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Total Amount']} />
                <Bar dataKey="totalAmount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Trend Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Trend Analysis</CardTitle>
            <CardDescription>Monthly spending patterns with projections</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Store Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle>Store Expense Ranking</CardTitle>
          <CardDescription>Performance metrics by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {storeComparison
              .sort((a, b) => b.totalAmount - a.totalAmount)
              .map((store, index) => (
                <div key={store.store} className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{store.store}</p>
                      <p className="text-sm text-muted-foreground">
                        {store.count} transactions • Avg: {formatCurrency(store.avgExpense)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(store.totalAmount)}</p>
                    {store.pendingCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {store.pendingCount} pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
