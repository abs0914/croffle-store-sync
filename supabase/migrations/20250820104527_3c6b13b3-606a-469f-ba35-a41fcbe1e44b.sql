-- Fix BIR audit function digest issue
DROP FUNCTION IF EXISTS public.log_bir_audit CASCADE;

CREATE OR REPLACE FUNCTION public.log_bir_audit(
    p_store_id uuid,
    p_log_type character varying,
    p_event_name character varying,
    p_event_data jsonb,
    p_user_id uuid DEFAULT NULL::uuid,
    p_cashier_name character varying DEFAULT NULL::character varying,
    p_terminal_id character varying DEFAULT 'TERMINAL-01'::character varying,
    p_transaction_id uuid DEFAULT NULL::uuid,
    p_receipt_number character varying DEFAULT NULL::character varying
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
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
    
    -- Generate hash using encode and digest with proper casting
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
$function$;

-- Create inventory_sync_audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.inventory_sync_audit (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id uuid REFERENCES public.transactions(id),
    sync_status text NOT NULL,
    error_details text,
    items_processed integer DEFAULT 0,
    sync_duration_ms integer,
    created_at timestamp with time zone DEFAULT now(),
    resolved_by uuid REFERENCES public.app_users(user_id),
    resolved_at timestamp with time zone
);

-- Enable RLS on inventory_sync_audit
ALTER TABLE public.inventory_sync_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_sync_audit
CREATE POLICY "System can insert sync audit entries"
    ON public.inventory_sync_audit
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Users can view sync audit for their stores"
    ON public.inventory_sync_audit
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            JOIN public.app_users au ON au.user_id = auth.uid()
            WHERE t.id = inventory_sync_audit.transaction_id
            AND (au.role IN ('admin', 'owner') OR t.store_id = ANY(au.store_ids))
        )
    );

CREATE POLICY "Authorized users can update sync audit"
    ON public.inventory_sync_audit
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            JOIN public.app_users au ON au.user_id = auth.uid()
            WHERE t.id = inventory_sync_audit.transaction_id
            AND (au.role IN ('admin', 'owner', 'manager') OR t.store_id = ANY(au.store_ids))
        )
    );

-- Create function for logging inventory sync results
CREATE OR REPLACE FUNCTION public.log_inventory_sync_result(
    p_transaction_id uuid,
    p_sync_status text,
    p_error_details text DEFAULT NULL::text,
    p_items_processed integer DEFAULT 0,
    p_sync_duration_ms integer DEFAULT NULL::integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  INSERT INTO public.inventory_sync_audit (
    transaction_id,
    sync_status,
    error_details,
    items_processed,
    sync_duration_ms
  ) VALUES (
    p_transaction_id,
    p_sync_status,
    p_error_details,
    p_items_processed,
    p_sync_duration_ms
  )
  ON CONFLICT (transaction_id)
  DO UPDATE SET
    sync_status = EXCLUDED.sync_status,
    error_details = EXCLUDED.error_details,
    items_processed = EXCLUDED.items_processed,
    sync_duration_ms = EXCLUDED.sync_duration_ms,
    created_at = NOW();
END;
$function$;