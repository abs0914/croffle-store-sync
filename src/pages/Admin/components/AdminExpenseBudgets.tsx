
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, TrendingUp, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { expenseService } from '@/services/expense/expenseService';
import { toast } from 'sonner';
import type { CreateBudgetRequest } from '@/types/expense';

export default function AdminExpenseBudgets() {
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['admin-expense-budgets'],
    queryFn: () => expenseService.getBudgets()
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

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseService.getCategories()
  });

  const createBudgetMutation = useMutation({
    mutationFn: (data: CreateBudgetRequest) => expenseService.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expense-budgets'] });
      toast.success('Budget created successfully');
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to create budget');
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const getBudgetStatus = (utilization: number) => {
    if (utilization >= 100) return { color: 'destructive', label: 'Over Budget' };
    if (utilization >= 80) return { color: 'orange', label: 'High Usage' };
    if (utilization >= 60) return { color: 'yellow', label: 'Moderate' };
    return { color: 'green', label: 'On Track' };
  };

  const handleCreateBudget = (formData: FormData) => {
    const data: CreateBudgetRequest = {
      store_id: formData.get('store_id') as string,
      category_id: formData.get('category_id') as string,
      budget_period: formData.get('budget_period') as 'monthly' | 'quarterly' | 'yearly',
      budget_year: parseInt(formData.get('budget_year') as string),
      budget_month: formData.get('budget_month') ? parseInt(formData.get('budget_month') as string) : undefined,
      budget_quarter: formData.get('budget_quarter') ? parseInt(formData.get('budget_quarter') as string) : undefined,
      allocated_amount: parseFloat(formData.get('allocated_amount') as string)
    };

    createBudgetMutation.mutate(data);
  };

  const filteredBudgets = budgets?.filter(budget => 
    !selectedStore || budget.store_id === selectedStore
  ) || [];

  // Calculate summary statistics
  const totalAllocated = filteredBudgets.reduce((sum, budget) => sum + budget.allocated_amount, 0);
  const totalSpent = filteredBudgets.reduce((sum, budget) => sum + (budget.spent_amount || 0), 0);
  const averageUtilization = filteredBudgets.length > 0 
    ? filteredBudgets.reduce((sum, budget) => sum + (budget.utilization_percentage || 0), 0) / filteredBudgets.length 
    : 0;
  const overBudgetCount = filteredBudgets.filter(budget => (budget.utilization_percentage || 0) > 100).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Loading budget information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Budget Management
              </CardTitle>
              <CardDescription>
                Manage expense budgets across all stores and categories
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Budget
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Budget</DialogTitle>
                  <DialogDescription>
                    Set up a new budget allocation for a store and category
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateBudget(new FormData(e.target as HTMLFormElement));
                }}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="store_id">Store</Label>
                      <Select name="store_id" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores?.map(store => (
                            <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="category_id">Category</Label>
                      <Select name="category_id" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map(category => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="budget_period">Period</Label>
                      <Select name="budget_period" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="budget_year">Year</Label>
                        <Input
                          name="budget_year"
                          type="number"
                          defaultValue={new Date().getFullYear()}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="budget_month">Month (if monthly)</Label>
                        <Input
                          name="budget_month"
                          type="number"
                          min="1"
                          max="12"
                          placeholder="1-12"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="allocated_amount">Allocated Amount (₱)</Label>
                      <Input
                        name="allocated_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createBudgetMutation.isPending}>
                      {createBudgetMutation.isPending ? 'Creating...' : 'Create Budget'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
            <Select value={selectedStore || "all"} onValueChange={(value) => setSelectedStore(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                  {stores?.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAllocated)}</div>
            <p className="text-xs text-muted-foreground">
              Across {filteredBudgets.length} budgets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {((totalSpent / totalAllocated) * 100).toFixed(1)}% of allocated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageUtilization.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Average across budgets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overBudgetCount}</div>
            <p className="text-xs text-muted-foreground">Categories exceeded</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget List */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Details</CardTitle>
          <CardDescription>
            Current budget allocations and utilization across categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredBudgets.map((budget) => {
              const status = getBudgetStatus(budget.utilization_percentage || 0);
              
              return (
                <div key={budget.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{budget.category?.name}</h3>
                        <Badge variant="outline">{budget.budget_period}</Badge>
                        <Badge variant={status.color as any}>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {budget.store_name} • {budget.budget_year}
                        {budget.budget_month && ` - ${new Date(0, budget.budget_month - 1).toLocaleString('default', { month: 'long' })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Spent: {formatCurrency(budget.spent_amount || 0)}</span>
                      <span>Budget: {formatCurrency(budget.allocated_amount)}</span>
                    </div>
                    <Progress 
                      value={Math.min(budget.utilization_percentage || 0, 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{(budget.utilization_percentage || 0).toFixed(1)}% utilized</span>
                      <span>
                        {formatCurrency(budget.allocated_amount - (budget.spent_amount || 0))} remaining
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredBudgets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No budgets found. Create your first budget to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
