
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  store_id: string;
  category_id: string;
  amount: number;
  description: string;
  receipt_url?: string;
  expense_date: string;
  status: 'pending' | 'approved' | 'rejected';
  approval_level: number;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  category?: ExpenseCategory;
  store_name?: string;
  created_by_name?: string;
  approved_by_name?: string;
}

export interface ExpenseBudget {
  id: string;
  store_id: string;
  category_id: string;
  budget_period: 'monthly' | 'quarterly' | 'yearly';
  budget_year: number;
  budget_month?: number;
  budget_quarter?: number;
  allocated_amount: number;
  spent_amount: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  category?: ExpenseCategory;
  store_name?: string;
  utilization_percentage?: number;
}

export interface ExpenseApproval {
  id: string;
  expense_id: string;
  approver_id: string;
  approval_level: number;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approved_at?: string;
  created_at: string;
  
  // Joined fields
  expense?: Expense;
  approver_name?: string;
}

export interface ExpenseApprovalLimit {
  id: string;
  role: string;
  store_id?: string;
  max_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseStats {
  total_expenses: number;
  pending_approvals: number;
  budget_utilization: number;
  monthly_trend: Array<{
    month: string;
    amount: number;
  }>;
  category_breakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

// New audit trail types
export interface ExpenseAuditTrail {
  id: string;
  entity_type: 'expense' | 'budget' | 'approval' | 'category';
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_fields?: string[];
  user_id: string;
  user_name?: string;
  user_role?: string;
  store_id?: string;
  reason?: string;
  created_at: string;
}

export interface CreateExpenseRequest {
  store_id: string;
  category_id: string;
  amount: number;
  description: string;
  receipt_url?: string;
  expense_date: string;
}

export interface UpdateExpenseRequest {
  amount?: number;
  description?: string;
  receipt_url?: string;
  expense_date?: string;
  status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

export interface CreateBudgetRequest {
  store_id: string;
  category_id: string;
  budget_period: 'monthly' | 'quarterly' | 'yearly';
  budget_year: number;
  budget_month?: number;
  budget_quarter?: number;
  allocated_amount: number;
}
