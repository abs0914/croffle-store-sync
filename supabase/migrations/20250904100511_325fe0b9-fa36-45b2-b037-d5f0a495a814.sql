-- Insert basic chart of accounts seed data
INSERT INTO chart_of_accounts (account_code, account_name, account_type, account_subtype, description, is_system_account, is_active) VALUES
-- Assets
('1001', 'Cash', 'assets', 'current_assets', 'Cash on hand and in banks', true, true),
('1101', 'Accounts Receivable', 'assets', 'current_assets', 'Money owed by customers', true, true),
('1201', 'Inventory', 'assets', 'current_assets', 'Products and materials for sale', true, true),
('1501', 'Equipment', 'assets', 'fixed_assets', 'Business equipment and machinery', true, true),
('1601', 'Accumulated Depreciation - Equipment', 'assets', 'fixed_assets', 'Accumulated depreciation on equipment', true, true),

-- Liabilities
('2001', 'Accounts Payable', 'liabilities', 'current_liabilities', 'Money owed to suppliers', true, true),
('2101', 'Wages Payable', 'liabilities', 'current_liabilities', 'Unpaid employee wages', true, true),
('2201', 'Taxes Payable', 'liabilities', 'current_liabilities', 'Taxes owed to government', true, true),

-- Equity
('3001', 'Owner''s Capital', 'equity', 'paid_in_capital', 'Owner''s investment in the business', true, true),
('3201', 'Retained Earnings', 'equity', 'retained_earnings', 'Accumulated profits retained in business', true, true),

-- Revenue
('4001', 'Sales Revenue', 'revenue', 'operating_revenue', 'Revenue from product sales', true, true),
('4101', 'Service Revenue', 'revenue', 'operating_revenue', 'Revenue from services provided', true, true),

-- Expenses
('5001', 'Cost of Goods Sold', 'expenses', 'cost_of_goods_sold', 'Direct costs of products sold', true, true),
('6001', 'Rent Expense', 'expenses', 'operating_expenses', 'Monthly rent payments', true, true),
('6101', 'Utilities Expense', 'expenses', 'operating_expenses', 'Electricity, water, internet costs', true, true),
('6201', 'Wages Expense', 'expenses', 'operating_expenses', 'Employee salaries and wages', true, true),
('6301', 'Depreciation Expense', 'expenses', 'operating_expenses', 'Depreciation of fixed assets', true, true),
('6401', 'Office Supplies Expense', 'expenses', 'operating_expenses', 'Cost of office supplies used', true, true);