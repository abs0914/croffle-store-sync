
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Plus, Edit } from 'lucide-react';
import { expenseService } from '@/services/expense/expenseService';
import { toast } from 'sonner';
import type { CreateBudgetRequest } from '@/types/expense';

export default function AdminExpenseBudgets() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedBudget, setSelectedBudget] = React.useState<string | null>(null);
  
  const [newBudget, setNewBudget] = React.useState<CreateBudgetRequest>({
    store_id: '',
    category_id: '',
    budget_period: 'monthly',
    budget_year: new Date().getFullYear(),
    budget_month: new Date().getMonth() + 1,
    allocated_amount: 0
  });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['admin-expense-budgets'],
    queryFn: () => expenseService.getBudgets()
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseService.getCategories()
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

  const createMutation = useMutation({
    mutationFn: (budget: CreateBudgetRequest) => expenseService.createBudget(budget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expense-budgets'] });
      toast.success('Budget created successfully');
      setIsCreateOpen(false);
      setNewBudget({
        store_id: '',
        category_id: '',
        budget_period: 'monthly',
        budget_year: new Date().getFullYear(),
        budget_month: new Date().getMonth() + 1,
        allocated_amount: 0
      });
    },
    onError: () => {
      toast.error('Failed to create budget');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => 
      expenseService.updateBudget(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expense-budgets'] });
      toast.success('Budget updated successfully');
      setSelectedBudget(null);
    },
    onError: () => {
      toast.error('Failed to update budget');
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const getBudgetStatus = (utilization: number) => {
    if (utilization > 100) return { color: 'bg-red-500', status: 'Over Budget' };
    if (utilization > 80) return { color: 'bg-yellow-500', status: 'Warning' };
    return { color: 'bg-green-500', status: 'On Track' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Set and monitor expense budgets across stores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Set and monitor expense budgets across stores</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Budget</DialogTitle>
              <DialogDescription>Set up a new expense budget</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Store</Label>
                <Select 
                  value={newBudget.store_id} 
                  onValueChange={(value) => setNewBudget(prev => ({ ...prev, store_id: value }))}
                >
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
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={newBudget.category_id} 
                  onValueChange={(value) => setNewBudget(prev => ({ ...prev, category_id: value }))}
                >
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select 
                    value={newBudget.budget_period} 
                    onValueChange={(value: 'monthly' | 'quarterly' | 'yearly') => 
                      setNewBudget(prev => ({ ...prev, budget_period: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={newBudget.budget_year}
                    onChange={(e) => setNewBudget(prev => ({ 
                      ...prev, 
                      budget_year: parseInt(e.target.value) 
                    }))}
                  />
                </div>
              </div>

              {newBudget.budget_period === 'monthly' && (
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select 
                    value={newBudget.budget_month?.toString()} 
                    onValueChange={(value) => setNewBudget(prev => ({ 
                      ...prev, 
                      budget_month: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Budget Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newBudget.allocated_amount}
                  onChange={(e) => setNewBudget(prev => ({ 
                    ...prev, 
                    allocated_amount: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createMutation.mutate(newBudget)}
                disabled={!newBudget.store_id || !newBudget.category_id || !newBudget.allocated_amount}
              >
                Create Budget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {budgets?.map((budget) => {
            const status = getBudgetStatus(budget.utilization_percentage || 0);
            
            return (
              <div key={budget.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{budget.category?.name}</h3>
                    <p className="text-sm text-muted-foreground">{budget.store_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(budget.allocated_amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {budget.budget_period} • {budget.budget_year}
                      {budget.budget_month && ` • ${new Date(budget.budget_year, (budget.budget_month || 1) - 1).toLocaleDateString('en-US', { month: 'long' })}`}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Spent: {formatCurrency(budget.spent_amount)}</span>
                    <span className={`font-medium ${(budget.utilization_percentage || 0) > 100 ? 'text-red-600' : ''}`}>
                      {Math.round(budget.utilization_percentage || 0)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(budget.utilization_percentage || 0, 100)} 
                    className="h-2" 
                  />
                  <div className="flex justify-between items-center">
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${status.color}`}>
                      {status.status}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
