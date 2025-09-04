-- Create Accounting System Tables (Fixed SQL syntax)

-- Chart of Accounts
CREATE TABLE public.chart_of_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code VARCHAR(20) NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('assets', 'liabilities', 'equity', 'revenue', 'expenses')),
  account_subtype TEXT,
  parent_account_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system_account BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Account Balances (Period-end balances)
CREATE TABLE public.account_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  store_id UUID REFERENCES public.stores(id),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  beginning_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  ending_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  debit_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, store_id, period_year, period_month)
);

-- Journal Entries (General Ledger)
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id),
  journal_number VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type TEXT,
  reference_id UUID,
  description TEXT NOT NULL,
  total_debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_posted BOOLEAN NOT NULL DEFAULT false,
  posted_by UUID,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journal Entry Lines
CREATE TABLE public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  line_number INTEGER NOT NULL,
  description TEXT,
  debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fiscal Periods
CREATE TABLE public.fiscal_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_by UUID,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, period_year, period_month)
);

-- Financial Adjustments (Manual entries)
CREATE TABLE public.financial_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id),
  adjustment_type TEXT NOT NULL,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  debit_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  credit_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default Chart of Accounts (Fixed apostrophes)
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, is_system_account, description) VALUES
-- Assets
('1000', 'Cash and Cash Equivalents', 'assets', 'current_assets', true, 'Cash, bank accounts, and cash equivalents'),
('1100', 'Accounts Receivable', 'assets', 'current_assets', true, 'Money owed by customers'),
('1200', 'Inventory', 'assets', 'current_assets', true, 'Raw materials and finished goods'),
('1300', 'Prepaid Expenses', 'assets', 'current_assets', true, 'Prepaid rent, insurance, etc.'),
('1500', 'Equipment', 'assets', 'fixed_assets', true, 'Kitchen equipment, POS systems, etc.'),
('1600', 'Accumulated Depreciation - Equipment', 'assets', 'fixed_assets', true, 'Accumulated depreciation on equipment'),

-- Liabilities
('2000', 'Accounts Payable', 'liabilities', 'current_liabilities', true, 'Money owed to suppliers'),
('2100', 'Accrued Expenses', 'liabilities', 'current_liabilities', true, 'Wages, utilities, taxes payable'),
('2200', 'Short-term Loans', 'liabilities', 'current_liabilities', true, 'Loans due within one year'),
('2500', 'Long-term Debt', 'liabilities', 'long_term_liabilities', true, 'Loans due after one year'),

-- Equity
('3000', 'Owners Equity', 'equity', 'capital', true, 'Owner investment in the business'),
('3100', 'Retained Earnings', 'equity', 'retained_earnings', true, 'Accumulated profits and losses'),
('3200', 'Current Year Earnings', 'equity', 'current_earnings', true, 'Current period profit or loss'),

-- Revenue
('4000', 'Sales Revenue', 'revenue', 'operating_revenue', true, 'Revenue from food and beverage sales'),
('4100', 'Other Revenue', 'revenue', 'other_revenue', true, 'Miscellaneous revenue'),

-- Expenses
('5000', 'Cost of Goods Sold', 'expenses', 'cogs', true, 'Direct costs of products sold'),
('6000', 'Operating Expenses', 'expenses', 'operating_expenses', true, 'General operating expenses'),
('6100', 'Rent Expense', 'expenses', 'operating_expenses', true, 'Store rent payments'),
('6200', 'Utilities Expense', 'expenses', 'operating_expenses', true, 'Electricity, water, gas'),
('6300', 'Wages and Salaries', 'expenses', 'operating_expenses', true, 'Staff compensation'),
('6400', 'Marketing Expense', 'expenses', 'operating_expenses', true, 'Advertising and promotion'),
('6500', 'Depreciation Expense', 'expenses', 'operating_expenses', true, 'Equipment depreciation'),
('6600', 'Other Operating Expenses', 'expenses', 'operating_expenses', true, 'Miscellaneous operating costs');

-- Enable RLS
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;