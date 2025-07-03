
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingUp, Clock, AlertTriangle, DollarSign, Receipt, BarChart3, Settings, Smartphone, Camera } from 'lucide-react';
import { expenseService } from '@/services/expense/expenseService';
import { useAuth } from '@/contexts/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import { ExpenseErrorBoundary } from '@/components/shared/ExpenseErrorBoundary';
import { ExpensesFallback } from '@/components/shared/ExpensesFallback';
import ExpenseEntryForm from './components/ExpenseEntryForm';
import ExpenseReports from './components/ExpenseReports';
import MobileExpenseEntry from './components/MobileExpenseEntry';
import ExpenseIntegrations from './components/ExpenseIntegrations';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function ExpensesDashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const storeId = user?.role === 'admin' || user?.role === 'owner' ? undefined : user?.storeIds?.[0];
  const [activeTab, setActiveTab] = useState('overview');

  // Check store access
  const hasStoreAccess = user?.role === 'admin' || user?.role === 'owner' || (user?.storeIds && user.storeIds.length > 0);

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['expense-stats', storeId],
    queryFn: () => expenseService.getExpenseStats(storeId),
    enabled: hasStoreAccess
  });

  const { data: recentExpenses, isLoading: expensesLoading, error: expensesError, refetch: refetchExpenses } = useQuery({
    queryKey: ['recent-expenses', storeId],
    queryFn: () => expenseService.getExpenses(storeId),
    enabled: hasStoreAccess
  });

  const { data: budgets, isLoading: budgetsLoading, error: budgetsError, refetch: refetchBudgets } = useQuery({
    queryKey: ['expense-budgets', storeId],
    queryFn: () => expenseService.getBudgets(storeId),
    enabled: hasStoreAccess
  });

  const isLoading = statsLoading || expensesLoading || budgetsLoading;
  const hasError = statsError || expensesError || budgetsError;

  const handleRetry = () => {
    refetchStats();
    refetchExpenses();
    refetchBudgets();
  };

  // Return fallback states
  if (!hasStoreAccess || hasError || isLoading) {
    return (
      <ExpensesFallback
        error={hasError}
        onRetry={handleRetry}
        isLoading={isLoading}
        hasStoreAccess={hasStoreAccess}
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
    <>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Expenses Dashboard</h1>
            <p className="text-muted-foreground text-sm md:text-base">Track and manage your business expenses</p>
          </div>
          {!isMobile && (
            <Button onClick={() => setActiveTab('entry')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-5'}`}>
            <TabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
              {isMobile ? 'Overview' : 'Overview'}
            </TabsTrigger>
            {!isMobile && (
              <TabsTrigger value="entry" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                New Expense
              </TabsTrigger>
            )}
            <TabsTrigger value="reports" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
              Reports
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="integrations" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Integrations
                </TabsTrigger>
                <TabsTrigger value="mobile" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards - Mobile Responsive */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Total Expenses</CardTitle>
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">{formatCurrency(stats?.total_expenses || 0)}</div>
                  <p className="text-xs text-muted-foreground">This year</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">{stats?.pending_approvals || 0}</div>
                  <p className="text-xs text-muted-foreground">Approvals</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Budget Usage</CardTitle>
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">
                    {budgets && budgets.length > 0 
                      ? Math.round(budgets.reduce((sum, b) => sum + (b.utilization_percentage || 0), 0) / budgets.length) 
                      : 0
                    }%
                  </div>
                  <p className="text-xs text-muted-foreground">Average</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Over Budget</CardTitle>
                  <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">
                    {budgets?.filter(b => (b.utilization_percentage || 0) > 100).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Categories</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts - Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Monthly Trend</CardTitle>
                  <CardDescription className="text-sm">Expense patterns throughout the year</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                    <LineChart data={stats?.monthly_trend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} />
                      <YAxis fontSize={isMobile ? 10 : 12} />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                      <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Categories</CardTitle>
                  <CardDescription className="text-sm">Breakdown by category this year</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                    <PieChart>
                      <Pie
                        data={stats?.category_breakdown || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percentage }) => 
                          isMobile ? `${percentage.toFixed(0)}%` : `${category}: ${percentage.toFixed(1)}%`
                        }
                        outerRadius={isMobile ? 60 : 80}
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

            {/* Recent Expenses - Mobile Optimized */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Recent Expenses</CardTitle>
                <CardDescription className="text-sm">Latest expense entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentExpenses?.slice(0, isMobile ? 3 : 5).map((expense) => (
                    <div key={expense.id} className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} border-b pb-4 space-y-2 md:space-y-0`}>
                      <div className="space-y-1 flex-1">
                        <p className="font-medium text-sm md:text-base">{expense.description}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground">
                          <span>{expense.category?.name}</span>
                          <span>•</span>
                          <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{expense.created_by_name}</span>
                        </div>
                      </div>
                      <div className={`${isMobile ? 'flex justify-between items-center' : 'text-right'}`}>
                        <p className="font-medium text-sm md:text-base">{formatCurrency(expense.amount)}</p>
                        <Badge variant={
                          expense.status === 'approved' ? 'default' :
                          expense.status === 'rejected' ? 'destructive' : 'outline'
                        } className="text-xs">
                          {expense.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {!isMobile && (
            <TabsContent value="entry">
              <ExpenseEntryForm onSuccess={() => setActiveTab('overview')} />
            </TabsContent>
          )}

          <TabsContent value="reports">
            <ExpenseReports />
          </TabsContent>

          {!isMobile && (
            <>
              <TabsContent value="integrations">
                <ExpenseIntegrations />
              </TabsContent>

              <TabsContent value="mobile">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Mobile Features
                    </CardTitle>
                    <CardDescription>
                      Mobile-optimized expense management features
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Receipt className="h-8 w-8 text-blue-500" />
                            <div>
                              <h3 className="font-medium">Quick Entry</h3>
                              <p className="text-sm text-muted-foreground">
                                Add expenses with floating action button
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Camera className="h-8 w-8 text-green-500" />
                            <div>
                              <h3 className="font-medium">Camera Capture</h3>
                              <p className="text-sm text-muted-foreground">
                                Take photos of receipts directly
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-purple-500" />
                            <div>
                              <h3 className="font-medium">Touch Charts</h3>
                              <p className="text-sm text-muted-foreground">
                                Interactive charts optimized for touch
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Settings className="h-8 w-8 text-orange-500" />
                            <div>
                              <h3 className="font-medium">Offline Support</h3>
                              <p className="text-sm text-muted-foreground">
                                Work without internet connection
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Mobile App Features</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Floating action button for quick expense entry</li>
                        <li>• Camera integration for receipt capture</li>
                        <li>• Touch-optimized interface</li>
                        <li>• Offline data storage and sync</li>
                        <li>• Push notifications for approvals</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Mobile Floating Action Button */}
      {isMobile && <MobileExpenseEntry onSuccess={() => setActiveTab('overview')} />}
    </>
  );
}
