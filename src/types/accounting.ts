export interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses';
  account_subtype?: string;
  parent_account_id?: string;
  is_active: boolean;
  is_system_account: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountBalance {
  id: string;
  account_id: string;
  store_id?: string;
  period_year: number;
  period_month: number;
  beginning_balance: number;
  ending_balance: number;
  debit_total: number;
  credit_total: number;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  store_id?: string;
  journal_number: string;
  entry_date: string;
  reference_type?: string;
  reference_id?: string;
  description: string;
  total_debit: number;
  total_credit: number;
  is_posted: boolean;
  posted_by?: string;
  posted_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  line_number: number;
  description?: string;
  debit_amount: number;
  credit_amount: number;
  created_at: string;
}

export interface FiscalPeriod {
  id: string;
  store_id?: string;
  period_year: number;
  period_month: number;
  period_name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_by?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialAdjustment {
  id: string;
  store_id?: string;
  adjustment_type: 'accrual' | 'prepayment' | 'depreciation' | 'correction';
  adjustment_date: string;
  description: string;
  amount: number;
  debit_account_id: string;
  credit_account_id: string;
  journal_entry_id?: string;
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Financial Statement Types
export interface FinancialStatementFilters {
  store_id?: string;
  period_year: number;
  period_month?: number;
  period_quarter?: number;
  comparison_period?: {
    year: number;
    month?: number;
    quarter?: number;
  };
}

export interface IncomeStatementData {
  revenue: {
    sales_revenue: number;
    other_revenue: number;
    total_revenue: number;
  };
  cost_of_goods_sold: {
    raw_materials: number;
    direct_labor: number;
    total_cogs: number;
  };
  gross_profit: number;
  operating_expenses: {
    rent_expense: number;
    utilities_expense: number;
    wages_and_salaries: number;
    marketing_expense: number;
    depreciation_expense: number;
    other_expenses: number;
    total_operating_expenses: number;
  };
  net_income: number;
  gross_margin_percentage: number;
  net_margin_percentage: number;
}

export interface BalanceSheetData {
  assets: {
    current_assets: {
      cash_and_equivalents: number;
      accounts_receivable: number;
      inventory: number;
      prepaid_expenses: number;
      total_current_assets: number;
    };
    fixed_assets: {
      equipment: number;
      accumulated_depreciation: number;
      net_fixed_assets: number;
    };
    total_assets: number;
  };
  liabilities: {
    current_liabilities: {
      accounts_payable: number;
      accrued_expenses: number;
      short_term_loans: number;
      total_current_liabilities: number;
    };
    long_term_liabilities: {
      long_term_debt: number;
      total_long_term_liabilities: number;
    };
    total_liabilities: number;
  };
  equity: {
    owners_equity: number;
    retained_earnings: number;
    current_year_earnings: number;
    total_equity: number;
  };
}

export interface CashFlowData {
  operating_activities: {
    net_income: number;
    depreciation: number;
    working_capital_changes: {
      accounts_receivable_change: number;
      inventory_change: number;
      accounts_payable_change: number;
    };
    net_cash_from_operations: number;
  };
  investing_activities: {
    equipment_purchases: number;
    asset_sales: number;
    net_cash_from_investing: number;
  };
  financing_activities: {
    owner_contributions: number;
    owner_withdrawals: number;
    loan_proceeds: number;
    loan_payments: number;
    net_cash_from_financing: number;
  };
  net_change_in_cash: number;
  beginning_cash: number;
  ending_cash: number;
}

// Financial Statement Request/Response Types
export interface GenerateFinancialStatementRequest {
  statement_type: 'income' | 'balance_sheet' | 'cash_flow';
  filters: FinancialStatementFilters;
  format?: 'json' | 'pdf' | 'excel';
}

export interface FinancialStatementResponse {
  statement_type: string;
  period: string;
  store_name?: string;
  generated_at: string;
  data: IncomeStatementData | BalanceSheetData | CashFlowData;
}

// Financial Analytics Types
export interface FinancialRatios {
  profitability: {
    gross_profit_margin: number;
    net_profit_margin: number;
    return_on_assets: number;
    return_on_equity: number;
  };
  liquidity: {
    current_ratio: number;
    quick_ratio: number;
    cash_ratio: number;
  };
  efficiency: {
    asset_turnover: number;
    inventory_turnover: number;
    receivables_turnover: number;
  };
  leverage: {
    debt_to_equity: number;
    debt_to_assets: number;
    interest_coverage: number;
  };
}

export interface FinancialTrend {
  period: string;
  value: number;
  percentage_change?: number;
}

export interface FinancialKPI {
  name: string;
  current_value: number;
  previous_value?: number;
  percentage_change?: number;
  trend: 'up' | 'down' | 'stable';
  target_value?: number;
  category: 'profitability' | 'liquidity' | 'efficiency' | 'leverage';
}