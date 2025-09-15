-- Phase 1: Critical BIR Compliance Implementation

-- 1. Create void_transactions table for comprehensive void tracking
CREATE TABLE public.void_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    original_transaction_id UUID NOT NULL,
    original_receipt_number VARCHAR(50) NOT NULL,
    void_receipt_number VARCHAR(50) NOT NULL,
    void_reason_category TEXT NOT NULL CHECK (void_reason_category IN (
        'customer_request', 'cashier_error', 'system_error', 'management_decision', 
        'refund', 'exchange', 'price_correction', 'item_unavailable', 'other'
    )),
    void_reason TEXT NOT NULL,
    void_notes TEXT,
    voided_by_user_id UUID NOT NULL,
    voided_by_cashier_name TEXT NOT NULL,
    authorized_by_user_id UUID,
    authorized_by_name TEXT,
    original_total NUMERIC(12,2) NOT NULL,
    original_vat_amount NUMERIC(12,2) DEFAULT 0,
    original_discount_amount NUMERIC(12,2) DEFAULT 0,
    original_items JSONB NOT NULL,
    terminal_id VARCHAR(20) DEFAULT 'TERMINAL-01',
    sequence_number BIGINT,
    void_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    original_transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_bir_reported BOOLEAN DEFAULT FALSE,
    bir_report_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for void transactions
ALTER TABLE public.void_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view void transactions for their stores"
ON public.void_transactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.user_id = auth.uid() 
        AND au.is_active = true 
        AND (
            au.role IN ('admin', 'owner') 
            OR void_transactions.store_id = ANY(au.store_ids)
        )
    )
);

CREATE POLICY "Users can create void transactions for their stores"
ON public.void_transactions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.user_id = auth.uid() 
        AND au.is_active = true 
        AND (
            au.role IN ('admin', 'owner') 
            OR void_transactions.store_id = ANY(au.store_ids)
        )
    )
);

-- 2. Create AGT reset tracking table
CREATE TABLE public.agt_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    terminal_id VARCHAR(20) NOT NULL,
    reset_counter INTEGER NOT NULL,
    agt_before_reset NUMERIC(15,2) NOT NULL,
    reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reset_reason TEXT DEFAULT 'Maximum digit length reached',
    rdo_notification_sent BOOLEAN DEFAULT FALSE,
    rdo_notification_date TIMESTAMP WITH TIME ZONE,
    rdo_office VARCHAR(100),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS for AGT resets
ALTER TABLE public.agt_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AGT resets"
ON public.agt_resets FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.user_id = auth.uid() 
        AND au.role IN ('admin', 'owner')
    )
);

-- 3. Enhanced discount categories - Add National Athletes & Coaches and Solo Parent
-- Update BIR transaction interface to support new discount types
-- This will be handled in the application layer

-- 4. Create void sequence number function
CREATE OR REPLACE FUNCTION public.generate_void_sequence_number(p_store_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_sequence_number BIGINT;
BEGIN
    SELECT COALESCE(MAX(sequence_number), 0) + 1 
    INTO v_sequence_number 
    FROM public.void_transactions 
    WHERE store_id = p_store_id;
    
    RETURN v_sequence_number;
END;
$$;

-- 5. Create trigger to auto-generate void sequence numbers
CREATE OR REPLACE FUNCTION public.set_void_sequence_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := public.generate_void_sequence_number(NEW.store_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_void_sequence_number
    BEFORE INSERT ON public.void_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_void_sequence_number();

-- 6. Add indexes for performance
CREATE INDEX idx_void_transactions_store_id ON public.void_transactions(store_id);
CREATE INDEX idx_void_transactions_void_date ON public.void_transactions(void_date);
CREATE INDEX idx_void_transactions_original_transaction ON public.void_transactions(original_transaction_id);
CREATE INDEX idx_void_transactions_receipt_number ON public.void_transactions(original_receipt_number);

CREATE INDEX idx_agt_resets_store_terminal ON public.agt_resets(store_id, terminal_id);
CREATE INDEX idx_agt_resets_date ON public.agt_resets(reset_date);