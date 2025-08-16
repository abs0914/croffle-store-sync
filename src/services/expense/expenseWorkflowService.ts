import { supabase } from "@/integrations/supabase/client";
import { auditTrailService } from "./auditTrailService";
import { expenseService } from "./expenseService";
import type { Expense } from "@/types/expense";

export interface ApprovalRoute {
  id: string;
  role: string;
  min_amount: number;
  max_amount: number;
  approval_level: number;
  requires_receipt: boolean;
  auto_approve: boolean;
}

export interface BudgetAlert {
  id: string;
  budget_id: string;
  alert_type: 'threshold_warning' | 'threshold_exceeded' | 'budget_exhausted';
  threshold_percentage: number;
  notification_sent: boolean;
  created_at: string;
}

export const expenseWorkflowService = {
  // Automated Approval Routing
  async determineApprovalRoute(expense: Expense): Promise<ApprovalRoute[]> {
    const { data: routes, error } = await supabase
      .from('expense_approval_limits')
      .select('*')
      .lte('min_amount', expense.amount)
      .gte('max_amount', expense.amount)
      .order('approval_level');

    if (error) throw error;

    return routes?.map(route => ({
      id: route.id,
      role: route.role,
      min_amount: 0,
      max_amount: route.max_amount,
      approval_level: 1,
      requires_receipt: expense.amount > 1000, // Require receipt for expenses > ₱1000
      auto_approve: expense.amount < 500 // Auto-approve small expenses
    })) || [];
  },

  async processAutomaticApproval(expenseId: string): Promise<boolean> {
    try {
      const { data: expense } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expenseId)
        .single();

      if (!expense) return false;

      // Auto-approve if under threshold and has receipt
      if (expense.amount < 500 || (expense.amount < 1000 && expense.receipt_url)) {
        await expenseService.updateExpense(expenseId, {
          status: 'approved'
        });

        await auditTrailService.createAuditEntry({
          entity_type: 'expense',
          entity_id: expenseId,
          action: 'approve',
          reason: 'Automatic approval - amount under threshold',
          store_id: expense.store_id
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in automatic approval:', error);
      return false;
    }
  },

  // Real-time Budget Monitoring
  async checkBudgetStatus(storeId: string, categoryId: string, amount: number): Promise<{
    canProceed: boolean;
    alert?: BudgetAlert;
    remainingBudget: number;
    utilizationPercentage: number;
  }> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const { data: budget } = await supabase
      .from('expense_budgets')
      .select('*')
      .eq('store_id', storeId)
      .eq('category_id', categoryId)
      .eq('budget_year', currentYear)
      .eq('budget_month', currentMonth)
      .single();

    if (!budget) {
      return {
        canProceed: true,
        remainingBudget: 0,
        utilizationPercentage: 0
      };
    }

    const newSpentAmount = (budget.spent_amount || 0) + amount;
    const utilizationPercentage = (newSpentAmount / budget.allocated_amount) * 100;
    const remainingBudget = budget.allocated_amount - newSpentAmount;

    // Create alert if threshold exceeded
    let alert: BudgetAlert | undefined;
    if (utilizationPercentage >= 100) {
      alert = await this.createBudgetAlert(budget.id, 'budget_exhausted', 100);
    } else if (utilizationPercentage >= 90) {
      alert = await this.createBudgetAlert(budget.id, 'threshold_exceeded', 90);
    } else if (utilizationPercentage >= 80) {
      alert = await this.createBudgetAlert(budget.id, 'threshold_warning', 80);
    }

    return {
      canProceed: utilizationPercentage < 110, // Allow 10% overage
      alert,
      remainingBudget,
      utilizationPercentage
    };
  },

  async createBudgetAlert(budgetId: string, alertType: BudgetAlert['alert_type'], threshold: number): Promise<BudgetAlert> {
    const alertData = {
      budget_id: budgetId,
      alert_type: alertType,
      threshold_percentage: threshold,
      notification_sent: false
    };

    // Check if alert already exists for this budget and type (mock for now)
    // TODO: Implement with Supabase types after regeneration
    const existingAlert = null;

    if (existingAlert) {
      return existingAlert as BudgetAlert;
    }

    // Mock alert creation until types are updated
    const alert: BudgetAlert = {
      id: 'mock-' + Date.now(),
      budget_id: budgetId,
      alert_type: alertType,
      threshold_percentage: threshold,
      notification_sent: false,
      created_at: new Date().toISOString()
    };

    // Send notification (implement notification service)
    await this.sendBudgetNotification(alert);

    return alert;
  },

  async sendBudgetNotification(alert: BudgetAlert): Promise<void> {
    // TODO: Integrate with notification service (email, SMS, in-app)
    console.log('Budget alert triggered:', alert);
    
    // TODO: Mark notification as sent in database after types are updated
  },

  // Expense Validation
  async validateExpenseRequest(expense: {
    amount: number;
    category_id: string;
    store_id: string;
    description: string;
    receipt_url?: string;
  }): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Amount validation
    if (expense.amount <= 0) {
      errors.push('Amount must be greater than zero');
    }

    if (expense.amount > 50000) {
      warnings.push('Large expense amount requires additional documentation');
    }

    // Receipt validation
    if (expense.amount > 1000 && !expense.receipt_url) {
      errors.push('Receipt required for expenses over ₱1,000');
    }

    // Category validation
    const { data: category } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('id', expense.category_id)
      .eq('is_active', true)
      .single();

    if (!category) {
      errors.push('Invalid or inactive expense category');
    }

    // Budget check
    const budgetStatus = await this.checkBudgetStatus(
      expense.store_id,
      expense.category_id,
      expense.amount
    );

    if (!budgetStatus.canProceed) {
      errors.push('Expense would exceed budget limit');
    } else if (budgetStatus.utilizationPercentage > 80) {
      warnings.push(`Budget utilization will reach ${budgetStatus.utilizationPercentage.toFixed(1)}%`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  // Financial Integration Preparation
  async prepareForAccountingSync(expenseId: string): Promise<{
    chart_of_accounts_code: string;
    tax_code: string;
    debit_account: string;
    credit_account: string;
    reference_number: string;
  }> {
    const { data: expense } = await supabase
      .from('expenses')
      .select(`
        *,
        category:expense_categories(*),
        store:stores(*)
      `)
      .eq('id', expenseId)
      .single();

    if (!expense) throw new Error('Expense not found');

    // Map categories to chart of accounts
    const accountMapping: Record<string, string> = {
      'Office Supplies': '6001',
      'Utilities': '6002',
      'Marketing': '6003',
      'Equipment': '1400',
      'Professional Services': '6004',
      'Travel': '6005'
    };

    return {
      chart_of_accounts_code: accountMapping[expense.category?.name || ''] || '6000',
      tax_code: expense.amount > 1000 ? 'VAT' : 'EXEMPT',
      debit_account: accountMapping[expense.category?.name || ''] || '6000',
      credit_account: '1001', // Cash account
      reference_number: `EXP-${expense.id.slice(0, 8).toUpperCase()}`
    };
  },

  // Compliance Reporting
  async generateTaxComplianceData(storeId: string, dateRange: { from: string; to: string }) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select(`
        *,
        category:expense_categories(*)
      `)
      .eq('store_id', storeId)
      .eq('status', 'approved')
      .gte('expense_date', dateRange.from)
      .lte('expense_date', dateRange.to);

    const taxableExpenses = expenses?.filter(exp => exp.amount > 1000) || [];
    const totalTaxableAmount = taxableExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const vatAmount = totalTaxableAmount * 0.12; // 12% VAT in Philippines

    return {
      total_expenses: expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0,
      taxable_expenses: totalTaxableAmount,
      vat_amount: vatAmount,
      expense_count: expenses?.length || 0,
      receipts_available: expenses?.filter(exp => exp.receipt_url).length || 0,
      compliance_percentage: expenses?.length ? 
        (expenses.filter(exp => exp.receipt_url || exp.amount <= 1000).length / expenses.length) * 100 : 100
    };
  }
};