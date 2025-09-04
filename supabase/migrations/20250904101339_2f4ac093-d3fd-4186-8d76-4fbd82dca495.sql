-- Create general ledger table for BIR compliance
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

-- Add missing columns to existing journal_entries table for BIR compliance
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS entry_number VARCHAR(50);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS reversal_entry_id UUID REFERENCES journal_entries(id);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source_document_type TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source_document_id UUID;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS is_adjusting_entry BOOLEAN DEFAULT false;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS is_closing_entry BOOLEAN DEFAULT false;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS fiscal_period VARCHAR(7);

-- Add constraint for status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'journal_entries_status_check'
    ) THEN
        ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_status_check 
        CHECK (status IN ('draft', 'approved', 'posted', 'reversed'));
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_general_ledger_account ON general_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_general_ledger_date ON general_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_general_ledger_store ON general_ledger(store_id);
CREATE INDEX IF NOT EXISTS idx_account_balance_summary_period ON account_balance_summary(fiscal_period);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_number ON journal_entries(entry_number);
CREATE INDEX IF NOT EXISTS idx_journal_entries_fiscal_period ON journal_entries(fiscal_period);

-- Function to generate sequential journal entry numbers (BIR compliant)
CREATE OR REPLACE FUNCTION generate_sequential_journal_number()
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

-- Function to update general ledger when journal entries are posted
CREATE OR REPLACE FUNCTION update_general_ledger_on_post()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  line_record RECORD;
  current_balance NUMERIC(15,2) := 0;
BEGIN
  -- Only process when is_posted changes to true
  IF NEW.is_posted = true AND (OLD.is_posted IS NULL OR OLD.is_posted = false) THEN
    
    -- Set fiscal period if not set
    IF NEW.fiscal_period IS NULL THEN
      NEW.fiscal_period := TO_CHAR(NEW.entry_date, 'YYYY-MM');
    END IF;
    
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
        NEW.journal_number,
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

-- Create trigger to update general ledger when entries are posted
DROP TRIGGER IF EXISTS trigger_update_general_ledger_on_post ON journal_entries;
CREATE TRIGGER trigger_update_general_ledger_on_post
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_general_ledger_on_post();

-- Enable RLS on new tables
ALTER TABLE general_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balance_summary ENABLE ROW LEVEL SECURITY;

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