-- Create journal entries table for BIR-compliant accounting
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) NOT NULL UNIQUE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number VARCHAR(100),
  description TEXT NOT NULL,
  total_debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  store_id UUID REFERENCES stores(id),
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted', 'reversed')),
  reversal_entry_id UUID REFERENCES journal_entries(id),
  source_document_type TEXT,
  source_document_id UUID,
  notes TEXT,
  is_adjusting_entry BOOLEAN DEFAULT false,
  is_closing_entry BOOLEAN DEFAULT false,
  fiscal_period VARCHAR(7), -- Format: YYYY-MM
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create journal entry lines table
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  description TEXT,
  debit_amount NUMERIC(15,2) DEFAULT 0,
  credit_amount NUMERIC(15,2) DEFAULT 0,
  reference VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_amounts CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  )
);

-- Create general ledger table for account balances
CREATE TABLE general_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  journal_entry_line_id UUID NOT NULL REFERENCES journal_entry_lines(id),
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_number VARCHAR(100),
  debit_amount NUMERIC(15,2) DEFAULT 0,
  credit_amount NUMERIC(15,2) DEFAULT 0,
  running_balance NUMERIC(15,2) DEFAULT 0,
  store_id UUID REFERENCES stores(id),
  fiscal_period VARCHAR(7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create account balances summary table
CREATE TABLE account_balance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  store_id UUID REFERENCES stores(id),
  fiscal_period VARCHAR(7) NOT NULL,
  beginning_balance NUMERIC(15,2) DEFAULT 0,
  total_debits NUMERIC(15,2) DEFAULT 0,
  total_credits NUMERIC(15,2) DEFAULT 0,
  ending_balance NUMERIC(15,2) DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, store_id, fiscal_period)
);

-- Create indexes for better performance
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_number ON journal_entries(entry_number);
CREATE INDEX idx_journal_entries_store ON journal_entries(store_id);
CREATE INDEX idx_journal_entries_period ON journal_entries(fiscal_period);
CREATE INDEX idx_journal_entry_lines_journal ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(account_id);
CREATE INDEX idx_general_ledger_account ON general_ledger(account_id);
CREATE INDEX idx_general_ledger_date ON general_ledger(transaction_date);
CREATE INDEX idx_general_ledger_store ON general_ledger(store_id);
CREATE INDEX idx_account_balance_summary_period ON account_balance_summary(fiscal_period);

-- Function to generate journal entry numbers (BIR compliant sequential numbering)
CREATE OR REPLACE FUNCTION generate_journal_entry_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  entry_count INTEGER;
  entry_number TEXT;
BEGIN
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries
  WHERE DATE_PART('year', entry_date) = DATE_PART('year', CURRENT_DATE);
  
  entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((entry_count + 1)::TEXT, 6, '0');
  RETURN entry_number;
END;
$$;

-- Trigger to auto-generate journal entry numbers
CREATE OR REPLACE FUNCTION set_journal_entry_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    NEW.entry_number := generate_journal_entry_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_journal_entry_number
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_journal_entry_number();

-- Function to update general ledger when journal entries are posted
CREATE OR REPLACE FUNCTION update_general_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  line_record RECORD;
  current_balance NUMERIC(15,2) := 0;
BEGIN
  -- Only process when status changes to 'posted'
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status != 'posted') THEN
    
    -- Insert general ledger entries for each journal entry line
    FOR line_record IN 
      SELECT jel.*, coa.account_type
      FROM journal_entry_lines jel
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE jel.journal_entry_id = NEW.id
      ORDER BY jel.line_number
    LOOP
      -- Calculate running balance based on account type
      SELECT COALESCE(running_balance, 0) INTO current_balance
      FROM general_ledger 
      WHERE account_id = line_record.account_id 
      ORDER BY created_at DESC, id DESC 
      LIMIT 1;
      
      -- Update running balance based on account type and debit/credit nature
      IF line_record.account_type IN ('assets', 'expenses') THEN
        -- Assets and expenses increase with debits, decrease with credits
        current_balance := current_balance + line_record.debit_amount - line_record.credit_amount;
      ELSE
        -- Liabilities, equity, and revenue increase with credits, decrease with debits
        current_balance := current_balance + line_record.credit_amount - line_record.debit_amount;
      END IF;
      
      -- Insert into general ledger
      INSERT INTO general_ledger (
        account_id,
        journal_entry_line_id,
        transaction_date,
        description,
        reference_number,
        debit_amount,
        credit_amount,
        running_balance,
        store_id,
        fiscal_period
      ) VALUES (
        line_record.account_id,
        line_record.id,
        NEW.entry_date,
        COALESCE(line_record.description, NEW.description),
        NEW.reference_number,
        line_record.debit_amount,
        line_record.credit_amount,
        current_balance,
        NEW.store_id,
        NEW.fiscal_period
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_general_ledger
  AFTER UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_general_ledger();

-- Enable RLS on new tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balance_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journal_entries
CREATE POLICY "Admins can manage journal entries" 
ON journal_entries 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Users can view journal entries for their stores" 
ON journal_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND (
      role IN ('admin', 'owner') 
      OR (role = 'manager' AND store_id = ANY(store_ids))
    )
  )
);

-- RLS Policies for journal_entry_lines
CREATE POLICY "Admins can manage journal entry lines" 
ON journal_entry_lines 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Users can view journal entry lines for accessible entries" 
ON journal_entry_lines 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM journal_entries je
    JOIN app_users au ON au.user_id = auth.uid()
    WHERE je.id = journal_entry_lines.journal_entry_id
    AND (
      au.role IN ('admin', 'owner') 
      OR (au.role = 'manager' AND je.store_id = ANY(au.store_ids))
    )
  )
);

-- RLS Policies for general_ledger
CREATE POLICY "Admins can manage general ledger" 
ON general_ledger 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Users can view general ledger for their stores" 
ON general_ledger 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND (
      role IN ('admin', 'owner') 
      OR (role = 'manager' AND store_id = ANY(store_ids))
    )
  )
);

-- RLS Policies for account_balance_summary
CREATE POLICY "Admins can manage account balance summary" 
ON account_balance_summary 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Users can view account balance summary for their stores" 
ON account_balance_summary 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND (
      role IN ('admin', 'owner') 
      OR (role = 'manager' AND store_id = ANY(store_ids))
    )
  )
);