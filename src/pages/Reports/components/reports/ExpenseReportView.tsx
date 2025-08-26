import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, TrendingUp, Calendar, DollarSign, Receipt, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { expenseService } from '@/services/expense/expenseService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';

interface ExpenseReportViewProps {
  data: any;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  isAllStores?: boolean;
  storeId: string;
  selectedStoreId: string;
}

export function ExpenseReportView({ dateRange, isAllStores, selectedStoreId }: ExpenseReportViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch expenses for the selected period and store
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['expense-report', selectedStoreId, dateRange],
    queryFn: () => expenseService.getExpenses(selectedStoreId === 'all' ? undefined : selectedStoreId),
    enabled: !!selectedStoreId && selectedStoreId !== 'all'
  });

  // Fetch expense categories
  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseService.getCategories()
  });

  // Filter expenses based on date range and category
  const filteredExpenses = expenses?.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    const inDateRange = dateRange?.from && dateRange?.to 
      ? expenseDate >= dateRange.from && expenseDate <= dateRange.to
      : true;
    const inCategory = selectedCategory === 'all' || expense.category_id === selectedCategory;
    return inDateRange && inCategory && expense.status === 'approved';
  }) || [];

  // Calculate summary statistics
  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const averageExpense = filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;
  const expenseCount = filteredExpenses.length;

  // Prepare chart data - Daily expenses
  const dailyExpenseData = filteredExpenses.reduce((acc, expense) => {
    const date = format(new Date(expense.expense_date), 'MMM dd');
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      acc.push({ date, amount: expense.amount });
    }
    return acc;
  }, [] as Array<{ date: string; amount: number }>);

  // Category breakdown
  const categoryBreakdown = filteredExpenses.reduce((acc, expense) => {
    const categoryName = expense.category?.name || 'Unknown';
    const existing = acc.find(item => item.category === categoryName);
    if (existing) {
      existing.amount += expense.amount;
      existing.count += 1;
    } else {
      acc.push({ category: categoryName, amount: expense.amount, count: 1 });
    }
    return acc;
  }, [] as Array<{ category: string; amount: number; count: number }>);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const exportToCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No expense data to export');
      return;
    }

    const headers = ['Date', 'Category', 'Description', 'Amount', 'Status'];
    const csvData = filteredExpenses.map(expense => [
      format(new Date(expense.expense_date), 'yyyy-MM-dd'),
      expense.category?.name || 'Unknown',
      expense.description,
      expense.amount.toString(),
      expense.status
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
    
    toast.success('Expense report exported successfully');
  };

  if (selectedStoreId === 'all') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please select a specific store to view expense reports</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Profit & Loss Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Expense Report
          </CardTitle>
          <CardDescription>
            Track and analyze store expenses. This data feeds into your Profit & Loss calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Category Filter */}
            <div className="w-full sm:w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export Button */}
            <Button onClick={exportToCSV} disabled={filteredExpenses.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

            {/* Connection to P&L */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
              <span>Connects to</span>
              <ArrowRight className="h-4 w-4" />
              <span className="font-medium">Profit & Loss</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {expenseCount} approved transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageExpense)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Report Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {dateRange?.from && dateRange?.to ? (
                <>
                  {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                </>
              ) : (
                'All Time'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Expense Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Expense Trend</CardTitle>
            <CardDescription>Expense amounts over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyExpenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                <Bar dataKey="amount" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Profit & Loss Integration Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            Profit & Loss Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            The expense data shown here is automatically included in your Profit & Loss calculations:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Operating Expenses</h4>
              <p className="text-sm text-muted-foreground">
                All approved expenses reduce your net profit in the P&L report
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Category Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Expense categories help identify cost optimization opportunities
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Expense List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>
            {filteredExpenses.length} approved expenses found for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expensesLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading expenses...</p>
            ) : filteredExpenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No approved expenses found for the selected criteria
              </p>
            ) : (
              filteredExpenses.slice(0, 10).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{expense.description}</span>
                      <Badge variant="outline">{expense.category?.name}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(expense.amount)}</div>
                    <Badge variant="default">Approved</Badge>
                  </div>
                </div>
              ))
            )}
            {filteredExpenses.length > 10 && (
              <p className="text-center text-sm text-muted-foreground pt-4">
                Showing first 10 of {filteredExpenses.length} expenses. Export CSV for complete data.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}