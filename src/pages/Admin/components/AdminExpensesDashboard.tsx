import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Clock, AlertTriangle, DollarSign, BarChart3, Building2, Users, Eye } from 'lucide-react';
import { expenseService } from '@/services/expense/expenseService';
import { useAuth } from '@/contexts/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ExpenseErrorBoundary } from '@/components/shared/ExpenseErrorBoundary';
import { ExpensesFallback } from '@/components/shared/ExpensesFallback';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function AdminExpensesDashboard() {
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState<string | undefined>(undefined);

  // Admin always sees all stores data unless a specific store is selected
  const storeId = selectedStore;

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['admin-expense-stats', storeId],
    queryFn: () => expenseService.getExpenseStats(storeId),
    enabled: user?.role === 'admin' || user?.role === 'owner'
  });

  const { data: recentExpenses, isLoading: expensesLoading, error: expensesError, refetch: refetchExpenses } = useQuery({
    queryKey: ['admin-recent-expenses', storeId],
    queryFn: () => expenseService.getExpenses(storeId),
    enabled: user?.role === 'admin' || user?.role === 'owner'
  });

  const { data: budgets, isLoading: budgetsLoading, error: budgetsError, refetch: refetchBudgets } = useQuery({
    queryKey: ['admin-expense-budgets', storeId],
    queryFn: () => expenseService.getBudgets(storeId),
    enabled: user?.role === 'admin' || user?.role === 'owner'
  });

  const isLoading = statsLoading || expensesLoading || budgetsLoading;
  const hasError = statsError || expensesError || budgetsError;

  const handleRetry = () => {
    refetchStats();
    refetchExpenses();
    refetchBudgets();
  };

  // Return fallback states
  if (hasError || isLoading) {
    return (
      <ExpensesFallback
        error={hasError}
        onRetry={handleRetry}
        isLoading={isLoading}
        hasStoreAccess={true}
      />
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Admin Header - More compact for tab usage */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Expense Overview</h2>
          <p className="text-sm text-muted-foreground">
            {selectedStore ? 'Store-specific' : 'Cross-store'} expense analytics and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {selectedStore ? 'Store View' : 'All Stores'}
          </Badge>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      </div>

      {/* Compact Stats Cards for Admin */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.total_expenses || 0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold">{stats?.pending_approvals || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Budget Usage</p>
                <p className="text-2xl font-bold">
                  {budgets && budgets.length > 0 
                    ? Math.round(budgets.reduce((sum, b) => sum + (b.utilization_percentage || 0), 0) / budgets.length) 
                    : 0
                  }%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Over Budget</p>
                <p className="text-2xl font-bold">
                  {budgets?.filter(b => (b.utilization_percentage || 0) > 100).length || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compact Charts for Admin View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend - Compact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Trend</CardTitle>
            <CardDescription className="text-sm">Expense patterns across time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats?.monthly_trend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown - Compact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Category Distribution</CardTitle>
            <CardDescription className="text-sm">Spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.category_breakdown || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }) => `${percentage.toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {(stats?.category_breakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses - Compact List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Recent High-Priority Expenses
          </CardTitle>
          <CardDescription className="text-sm">Latest expense entries requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentExpenses?.slice(0, 3).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{expense.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{expense.category?.name}</span>
                    <span>•</span>
                    <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{expense.store_name || 'Unknown Store'}</span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="font-medium text-sm">{formatCurrency(expense.amount)}</p>
                  <Badge variant={
                    expense.status === 'approved' ? 'default' :
                    expense.status === 'rejected' ? 'destructive' : 'secondary'
                  } className="text-xs">
                    {expense.status}
                  </Badge>
                </div>
              </div>
            ))}
            {(!recentExpenses || recentExpenses.length === 0) && (
              <div className="text-center py-6 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent expenses found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}