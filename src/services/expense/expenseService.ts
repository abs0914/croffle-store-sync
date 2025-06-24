
import { supabase } from "@/integrations/supabase/client";
import type { 
  Expense, 
  ExpenseCategory, 
  ExpenseBudget, 
  ExpenseApproval,
  ExpenseApprovalLimit,
  ExpenseStats,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  CreateBudgetRequest
} from "@/types/expense";

export const expenseService = {
  // Categories
  async getCategories(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Expenses
  async getExpenses(storeId?: string): Promise<Expense[]> {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        category:expense_categories(name, description),
        store:stores(name),
        created_by_user:app_users!expenses_created_by_fkey(first_name, last_name),
        approved_by_user:app_users!expenses_approved_by_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(expense => ({
      ...expense,
      category: expense.category,
      store_name: expense.store?.name,
      created_by_name: expense.created_by_user 
        ? `${expense.created_by_user.first_name} ${expense.created_by_user.last_name}`
        : 'Unknown',
      approved_by_name: expense.approved_by_user
        ? `${expense.approved_by_user.first_name} ${expense.approved_by_user.last_name}`
        : undefined
    }));
  },

  async createExpense(expense: CreateExpenseRequest): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...expense,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        category:expense_categories(name, description),
        store:stores(name)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateExpense(id: string, updates: UpdateExpenseRequest): Promise<Expense> {
    const updateData: any = { ...updates };
    
    if (updates.status === 'approved') {
      updateData.approved_by = (await supabase.auth.getUser()).data.user?.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        category:expense_categories(name, description),
        store:stores(name)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Budgets
  async getBudgets(storeId?: string): Promise<ExpenseBudget[]> {
    let query = supabase
      .from('expense_budgets')
      .select(`
        *,
        category:expense_categories(name, description),
        store:stores(name)
      `)
      .order('budget_year', { ascending: false })
      .order('budget_month', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(budget => ({
      ...budget,
      category: budget.category,
      store_name: budget.store?.name,
      utilization_percentage: budget.allocated_amount > 0 
        ? (budget.spent_amount / budget.allocated_amount) * 100 
        : 0
    }));
  },

  async createBudget(budget: CreateBudgetRequest): Promise<ExpenseBudget> {
    const { data, error } = await supabase
      .from('expense_budgets')
      .insert({
        ...budget,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        category:expense_categories(name, description),
        store:stores(name)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateBudget(id: string, allocated_amount: number): Promise<ExpenseBudget> {
    const { data, error } = await supabase
      .from('expense_budgets')
      .update({ allocated_amount })
      .eq('id', id)
      .select(`
        *,
        category:expense_categories(name, description),
        store:stores(name)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Approval Limits
  async getApprovalLimits(): Promise<ExpenseApprovalLimit[]> {
    const { data, error } = await supabase
      .from('expense_approval_limits')
      .select('*')
      .order('max_amount');
    
    if (error) throw error;
    return data || [];
  },

  // Statistics
  async getExpenseStats(storeId?: string): Promise<ExpenseStats> {
    let expenseQuery = supabase
      .from('expenses')
      .select('amount, status, expense_date, category:expense_categories(name)');

    if (storeId) {
      expenseQuery = expenseQuery.eq('store_id', storeId);
    }

    const { data: expenses, error } = await expenseQuery;
    
    if (error) throw error;

    const currentYear = new Date().getFullYear();
    const currentYearExpenses = (expenses || []).filter(exp => 
      new Date(exp.expense_date).getFullYear() === currentYear
    );

    const totalExpenses = currentYearExpenses
      .filter(exp => exp.status === 'approved')
      .reduce((sum, exp) => sum + exp.amount, 0);

    const pendingApprovals = currentYearExpenses
      .filter(exp => exp.status === 'pending').length;

    // Calculate monthly trend
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthExpenses = currentYearExpenses.filter(exp => {
        const expenseMonth = new Date(exp.expense_date).getMonth() + 1;
        return expenseMonth === month && exp.status === 'approved';
      });
      
      return {
        month: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
        amount: monthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      };
    });

    // Calculate category breakdown
    const categoryTotals = currentYearExpenses
      .filter(exp => exp.status === 'approved')
      .reduce((acc, exp) => {
        const categoryName = exp.category?.name || 'Unknown';
        acc[categoryName] = (acc[categoryName] || 0) + exp.amount;
        return acc;
      }, {} as Record<string, number>);

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      total_expenses: totalExpenses,
      pending_approvals: pendingApprovals,
      budget_utilization: 0, // Will be calculated based on current budgets
      monthly_trend: monthlyTrend,
      category_breakdown: categoryBreakdown
    };
  }
};
