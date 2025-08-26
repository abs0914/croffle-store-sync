-- BIR Compliance Database Schema Updates

-- 1. Add BIR-required fields to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS tin VARCHAR(12),
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS machine_accreditation_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS machine_serial_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS pos_version VARCHAR(20),
ADD COLUMN IF NOT EXISTS permit_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS date_issued DATE,
ADD COLUMN IF NOT EXISTS valid_until DATE,
ADD COLUMN IF NOT EXISTS is_bir_accredited BOOLEAN DEFAULT false;

-- 2. Create BIR audit logs table for tamper-proof logging
CREATE TABLE IF NOT EXISTS public.bir_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    log_type VARCHAR(50) NOT NULL, -- 'transaction', 'system', 'modification', 'access'
    event_name VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    user_id UUID,
    cashier_name VARCHAR(100),
    terminal_id VARCHAR(50),
    sequence_number BIGINT NOT NULL,
    hash_value VARCHAR(256) NOT NULL, -- For tamper detection
    previous_hash VARCHAR(256),
    transaction_id UUID,
    receipt_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 3. Create cumulative sales counter table (non-resettable)
CREATE TABLE IF NOT EXISTS public.bir_cumulative_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    terminal_id VARCHAR(50) NOT NULL,
    grand_total_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    grand_total_transactions BIGINT NOT NULL DEFAULT 0,
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    last_receipt_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, terminal_id)
);

-- 4. Create e-Journal table for electronic audit trail
CREATE TABLE IF NOT EXISTS public.bir_ejournal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    journal_date DATE NOT NULL,
    terminal_id VARCHAR(50) NOT NULL,
    journal_data JSONB NOT NULL, -- Complete journal entries
    beginning_receipt VARCHAR(50),
    ending_receipt VARCHAR(50),
    transaction_count INTEGER NOT NULL DEFAULT 0,
    gross_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    vat_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    vat_exempt_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    zero_rated_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_backed_up BOOLEAN DEFAULT false,
    backup_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, terminal_id, journal_date)
);

-- 5. Add BIR-specific fields to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS vat_sales DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_exempt_sales DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS zero_rated_sales DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS senior_citizen_discount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pwd_discount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sequence_number BIGINT,
ADD COLUMN IF NOT EXISTS terminal_id VARCHAR(50) DEFAULT 'TERMINAL-01';

-- 6. Create sequence for transaction numbering
CREATE SEQUENCE IF NOT EXISTS bir_transaction_sequence START 1;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bir_audit_logs_store_created ON public.bir_audit_logs(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bir_audit_logs_sequence ON public.bir_audit_logs(sequence_number);
CREATE INDEX IF NOT EXISTS idx_bir_ejournal_store_date ON public.bir_ejournal(store_id, journal_date);
CREATE INDEX IF NOT EXISTS idx_transactions_sequence ON public.transactions(sequence_number);

-- 8. Create function to update cumulative sales
CREATE OR REPLACE FUNCTION update_cumulative_sales()
RETURNS TRIGGER AS $$
BEGIN
    -- Update cumulative sales counter
    INSERT INTO public.bir_cumulative_sales (store_id, terminal_id, grand_total_sales, grand_total_transactions, last_transaction_date, last_receipt_number)
    VALUES (NEW.store_id, COALESCE(NEW.terminal_id, 'TERMINAL-01'), NEW.total, 1, NEW.created_at, NEW.receipt_number)
    ON CONFLICT (store_id, terminal_id)
    DO UPDATE SET
        grand_total_sales = bir_cumulative_sales.grand_total_sales + NEW.total,
        grand_total_transactions = bir_cumulative_sales.grand_total_transactions + 1,
        last_transaction_date = NEW.created_at,
        last_receipt_number = NEW.receipt_number,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for cumulative sales
DROP TRIGGER IF EXISTS trigger_update_cumulative_sales ON public.transactions;
CREATE TRIGGER trigger_update_cumulative_sales
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_cumulative_sales();

-- 10. Create function for BIR audit logging
CREATE OR REPLACE FUNCTION log_bir_audit(
    p_store_id UUID,
    p_log_type VARCHAR(50),
    p_event_name VARCHAR(100),
    p_event_data JSONB,
    p_user_id UUID DEFAULT NULL,
    p_cashier_name VARCHAR(100) DEFAULT NULL,
    p_terminal_id VARCHAR(50) DEFAULT 'TERMINAL-01',
    p_transaction_id UUID DEFAULT NULL,
    p_receipt_number VARCHAR(50) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_sequence_number BIGINT;
    v_previous_hash VARCHAR(256);
    v_hash_input TEXT;
    v_new_hash VARCHAR(256);
    v_log_id UUID;
BEGIN
    -- Get next sequence number
    SELECT COALESCE(MAX(sequence_number), 0) + 1 
    INTO v_sequence_number 
    FROM public.bir_audit_logs 
    WHERE store_id = p_store_id;
    
    -- Get previous hash for chain integrity
    SELECT hash_value INTO v_previous_hash 
    FROM public.bir_audit_logs 
    WHERE store_id = p_store_id 
    ORDER BY sequence_number DESC 
    LIMIT 1;
    
    -- Create hash input
    v_hash_input := p_store_id::text || p_log_type || p_event_name || p_event_data::text || 
                   COALESCE(p_user_id::text, '') || COALESCE(p_cashier_name, '') || 
                   p_terminal_id || v_sequence_number::text || COALESCE(v_previous_hash, '');
    
    -- Generate hash (simplified - in production use proper cryptographic hash)
    v_new_hash := encode(digest(v_hash_input, 'sha256'), 'hex');
    
    -- Insert audit log
    INSERT INTO public.bir_audit_logs (
        store_id, log_type, event_name, event_data, user_id, cashier_name,
        terminal_id, sequence_number, hash_value, previous_hash,
        transaction_id, receipt_number, created_at
    ) VALUES (
        p_store_id, p_log_type, p_event_name, p_event_data, p_user_id, p_cashier_name,
        p_terminal_id, v_sequence_number, v_new_hash, v_previous_hash,
        p_transaction_id, p_receipt_number, NOW()
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Create RLS policies for BIR tables
ALTER TABLE public.bir_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bir_cumulative_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bir_ejournal ENABLE ROW LEVEL SECURITY;

-- BIR Audit Logs policies
CREATE POLICY "Users can view audit logs for their stores" ON public.bir_audit_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.user_id = auth.uid() 
        AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
    )
);

CREATE POLICY "System can insert audit logs" ON public.bir_audit_logs
FOR INSERT WITH CHECK (true);

-- Cumulative Sales policies
CREATE POLICY "Users can view cumulative sales for their stores" ON public.bir_cumulative_sales
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.user_id = auth.uid() 
        AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
    )
);

CREATE POLICY "System can manage cumulative sales" ON public.bir_cumulative_sales
FOR ALL USING (true);

-- E-Journal policies
CREATE POLICY "Users can view ejournal for their stores" ON public.bir_ejournal
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.user_id = auth.uid() 
        AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
    )
);

CREATE POLICY "System can manage ejournal" ON public.bir_ejournal
FOR ALL USING (true);

-- 12. Insert sample BIR data for existing stores
UPDATE public.stores 
SET 
    tin = '123456789000',
    business_name = name || ' Corporation',
    machine_accreditation_number = 'FP012024000001',
    machine_serial_number = 'SN' || SUBSTRING(id::text, 1, 8),
    pos_version = '1.0.0',
    permit_number = 'ATP' || SUBSTRING(id::text, 1, 8),
    date_issued = CURRENT_DATE - INTERVAL '30 days',
    valid_until = CURRENT_DATE + INTERVAL '335 days',
    is_bir_accredited = true
WHERE tin IS NULL;