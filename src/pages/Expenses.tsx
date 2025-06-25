
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category_id: string;
  expense_date: string;
  status: string;
  receipt_url?: string;
  created_at: string;
  expense_categories?: {
    name: string;
  };
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

export default function ExpensesPage() {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category_id: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    receipt_url: ''
  });

  useEffect(() => {
    if (currentStore?.id) {
      loadExpenses();
      loadCategories();
    }
  }, [currentStore?.id]);

  const loadExpenses = async () => {
    if (!currentStore?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories (
            name
          )
        `)
        .eq('store_id', currentStore.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id || !user?.id) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          store_id: currentStore.id,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          category_id: newExpense.category_id,
          expense_date: newExpense.expense_date,
          receipt_url: newExpense.receipt_url || null,
          created_by: user.id,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Expense added successfully');
      setNewExpense({
        description: '',
        amount: '',
        category_id: '',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        receipt_url: ''
      });
      setShowAddForm(false);
      loadExpenses();
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Failed to create expense');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'pending': return Clock;
      case 'rejected': return XCircle;
      default: return Clock;
    }
  };

  if (!currentStore) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Expenses Management</h1>
          <p className="text-muted-foreground">Please select a store to manage expenses.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses Management</h1>
          <p className="text-muted-foreground">Manage store expenses and track spending</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Add Expense Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    placeholder="Enter expense description"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newExpense.category_id} onValueChange={(value) => setNewExpense({...newExpense, category_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expense_date">Date</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="receipt_url">Receipt URL (Optional)</Label>
                  <Input
                    id="receipt_url"
                    value={newExpense.receipt_url}
                    onChange={(e) => setNewExpense({...newExpense, receipt_url: e.target.value})}
                    placeholder="https://example.com/receipt.pdf"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Add Expense</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No expenses found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => {
                const StatusIcon = getStatusIcon(expense.status);
                return (
                  <div key={expense.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{expense.description}</h3>
                        <p className="text-sm text-muted-foreground">
                          {expense.expense_categories?.name} • {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">₱{expense.amount.toLocaleString()}</span>
                        <Badge variant={getStatusColor(expense.status)} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {expense.status}
                        </Badge>
                      </div>
                    </div>
                    {expense.receipt_url && (
                      <div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
                            View Receipt
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
