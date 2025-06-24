
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingUp, Clock, AlertTriangle, DollarSign, Receipt, BarChart3 } from 'lucide-react';
import { expenseService } from '@/services/expense/expenseService';
import { useAuth } from '@/contexts/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ExpenseEntryForm from './components/ExpenseEntryForm';
import ExpenseReports from './components/ExpenseReports';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function ExpensesDashboard() {
  const { user } = useAuth();
  const storeId = user?.role === 'admin' || user?.role === 'owner' ? undefined : user?.storeIds?.[0];
  const [activeTab, setActiveTab] = useState('overview');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['expense-stats', storeId],
    queryFn: () => expenseService.getExpenseStats(storeId)
  });

  const { data: recentExpenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['recent-expenses', storeId],
    queryFn: () => expenseService.getExpenses(storeId)
  });

  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ['expense-budgets', storeId],
    queryFn: () => expenseService.getBudgets(storeId)
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  if (statsLoading || expensesLoading || budgetsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Expenses Dashboard</h1>
            <p className="text-muted-foreground">Track and manage your business expenses</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses Dashboard</h1>
          <p className="text-muted-foreground">Track and manage your business expenses</p>
        </div>
        <Button onClick={() => setActiveTab('entry')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="entry" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            New Expense
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.total_expenses || 0)}</div>
                <p className="text-xs text-muted-foreground">This year</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pending_approvals || 0}</div>
                <p className="text-xs text-muted-foreground">Requires approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {budgets && budgets.length > 0 
                    ? Math.round(budgets.reduce((sum, b) => sum + (b.utilization_percentage || 0), 0) / budgets.length) 
                    : 0
                  }%
                </div>
                <p className="text-xs text-muted-foreground">Average across categories</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {budgets?.filter(b => (b.utilization_percentage || 0) > 100).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Categories exceeded</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Expense Trend</CardTitle>
                <CardDescription>Expense patterns throughout the year</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats?.monthly_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>Breakdown by category this year</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats?.category_breakdown || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
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

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Latest expense entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentExpenses?.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between border-b pb-4">
                    <div className="space-y-1">
                      <p className="font-medium">{expense.description}</p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{expense.category?.name}</span>
                        <span>•</span>
                        <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{expense.created_by_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(expense.amount)}</p>
                      <Badge variant={
                        expense.status === 'approved' ? 'default' :
                        expense.status === 'rejected' ? 'destructive' : 'outline'
                      }>
                        {expense.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entry">
          <ExpenseEntryForm onSuccess={() => setActiveTab('overview')} />
        </TabsContent>

        <TabsContent value="reports">
          <ExpenseReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
