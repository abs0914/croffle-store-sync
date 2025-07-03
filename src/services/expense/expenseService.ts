
import { supabase } from "@/integrations/supabase/client";
import { auditTrailService } from "./auditTrailService";
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
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          category:expense_categories(*),
          store:stores(name)
        `)
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching expenses:', error);
        throw new Error(`Failed to fetch expenses: ${error.message}`);
      }
      
      return (data || []).map(expense => ({
        ...expense,
        status: expense.status as 'pending' | 'approved' | 'rejected',
        category: expense.category,
        store_name: expense.store?.name,
        created_by_name: 'Unknown', // We'll need to fetch this separately due to RLS
        approved_by_name: undefined
      }));
    } catch (error) {
      console.error('Error in getExpenses:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred while fetching expenses');
    }
  },


  async createExpense(expense: CreateExpenseRequest): Promise<Expense> {
    // Validate required fields
    if (!expense.store_id || expense.store_id.trim() === '') {
      throw new Error('Store ID is required');
    }
    
    if (!expense.category_id || expense.category_id.trim() === '') {
      throw new Error('Category ID is required');
    }
    
    if (!expense.description || expense.description.trim() === '') {
      throw new Error('Description is required');
    }
    
    if (expense.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...expense,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        category:expense_categories(*),
        store:stores(name)
      `)
      .single();
    
    if (error) throw error;

    const result = {
      ...data,
      status: data.status as 'pending' | 'approved' | 'rejected'
    };

    // Create audit trail
    await auditTrailService.createAuditEntry({
      entity_type: 'expense',
      entity_id: result.id,
      action: 'create',
      new_values: {
        amount: result.amount,
        description: result.description,
        category_id: result.category_id,
        status: result.status
      },
      store_id: result.store_id
    });

    return result;
  },

  async updateExpense(id: string, updates: UpdateExpenseRequest): Promise<Expense> {
    // Get current expense for audit trail
    const { data: currentExpense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

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
        category:expense_categories(*),
        store:stores(name)
      `)
      .single();
    
    if (error) throw error;

    const result = {
      ...data,
      status: data.status as 'pending' | 'approved' | 'rejected'
    };

    // Create audit trail
    await auditTrailService.createAuditEntry({
      entity_type: 'expense',
      entity_id: id,
      action: updates.status ? (updates.status === 'approved' ? 'approve' : updates.status === 'rejected' ? 'reject' : 'update') : 'update',
      old_values: currentExpense ? {
        amount: currentExpense.amount,
        description: currentExpense.description,
        status: currentExpense.status,
        rejection_reason: currentExpense.rejection_reason
      } : undefined,
      new_values: {
        amount: result.amount,
        description: result.description,
        status: result.status,
        rejection_reason: result.rejection_reason
      },
      store_id: result.store_id,
      reason: updates.rejection_reason
    });

    return result;
  },

  async deleteExpense(id: string): Promise<void> {
    // Get expense details for audit trail
    const { data: expense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;

    // Create audit trail
    if (expense) {
      await auditTrailService.createAuditEntry({
        entity_type: 'expense',
        entity_id: id,
        action: 'delete',
        old_values: {
          amount: expense.amount,
          description: expense.description,
          status: expense.status
        },
        store_id: expense.store_id
      });
    }
  },

  // Budgets
  async getBudgets(storeId?: string): Promise<ExpenseBudget[]> {
    let query = supabase
      .from('expense_budgets')
      .select(`
        *,
        category:expense_categories(*),
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
      budget_period: budget.budget_period as 'monthly' | 'quarterly' | 'yearly',
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
        category:expense_categories(*),
        store:stores(name)
      `)
      .single();
    
    if (error) throw error;

    const result = {
      ...data,
      budget_period: data.budget_period as 'monthly' | 'quarterly' | 'yearly'
    };

    // Create audit trail
    await auditTrailService.createAuditEntry({
      entity_type: 'budget',
      entity_id: result.id,
      action: 'create',
      new_values: {
        allocated_amount: result.allocated_amount,
        budget_period: result.budget_period,
        budget_year: result.budget_year,
        budget_month: result.budget_month
      },
      store_id: result.store_id
    });

    return result;
  },

  async updateBudget(id: string, allocated_amount: number): Promise<ExpenseBudget> {
    // Get current budget for audit trail
    const { data: currentBudget } = await supabase
      .from('expense_budgets')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('expense_budgets')
      .update({ allocated_amount })
      .eq('id', id)
      .select(`
        *,
        category:expense_categories(*),
        store:stores(name)
      `)
      .single();
    
    if (error) throw error;

    const result = {
      ...data,
      budget_period: data.budget_period as 'monthly' | 'quarterly' | 'yearly'
    };

    // Create audit trail
    await auditTrailService.createAuditEntry({
      entity_type: 'budget',
      entity_id: id,
      action: 'update',
      old_values: currentBudget ? {
        allocated_amount: currentBudget.allocated_amount
      } : undefined,
      new_values: {
        allocated_amount: result.allocated_amount
      },
      store_id: result.store_id
    });

    return result;
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
