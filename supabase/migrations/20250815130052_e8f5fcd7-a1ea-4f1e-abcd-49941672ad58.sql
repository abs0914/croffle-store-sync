-- Fix the BIR audit function - the digest function needs proper type casting
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
)
RETURNS uuid
LANGUAGE plpgsql
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
    
    -- Generate hash with proper type casting
    v_new_hash := encode(digest(v_hash_input::bytea, 'sha256'), 'hex');
    
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