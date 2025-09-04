-- Add missing RLS policies for accounting tables

-- Chart of Accounts policies
CREATE POLICY "Admins can manage chart of accounts" ON public.chart_of_accounts
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])))
WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])));

-- Account Balances policies
CREATE POLICY "Admins can view account balances for all stores" ON public.account_balances
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role, 'manager'::app_role])));

CREATE POLICY "Admins can manage account balances" ON public.account_balances
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])));

CREATE POLICY "Admins can update account balances" ON public.account_balances
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])))
WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])));

-- Journal Entries policies
CREATE POLICY "Admins can manage journal entries" ON public.journal_entries
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])))
WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])));

-- Journal Entry Lines policies
CREATE POLICY "Admins can manage journal entry lines" ON public.journal_entry_lines
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])))
WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])));

-- Fiscal Periods policies
CREATE POLICY "Admins can manage fiscal periods" ON public.fiscal_periods
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])))
WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])));

-- Financial Adjustments policies
CREATE POLICY "Admins can manage financial adjustments" ON public.financial_adjustments
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])))
WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])));