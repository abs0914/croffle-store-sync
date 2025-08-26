-- Fix update_cumulative_sales function to include terminal_id

CREATE OR REPLACE FUNCTION public.update_cumulative_sales(
    p_store_id UUID,
    p_transaction_total NUMERIC,
    p_receipt_number TEXT DEFAULT NULL,
    p_terminal_id TEXT DEFAULT 'TERMINAL-01'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Insert or update cumulative sales record
    INSERT INTO public.bir_cumulative_sales (
        store_id,
        terminal_id,
        grand_total_sales,
        grand_total_transactions,
        last_receipt_number,
        last_transaction_date,
        created_at,
        updated_at
    ) VALUES (
        p_store_id,
        p_terminal_id,
        p_transaction_total,
        1,
        p_receipt_number,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (store_id) DO UPDATE SET
        grand_total_sales = bir_cumulative_sales.grand_total_sales + p_transaction_total,
        grand_total_transactions = bir_cumulative_sales.grand_total_transactions + 1,
        last_receipt_number = COALESCE(p_receipt_number, bir_cumulative_sales.last_receipt_number),
        last_transaction_date = NOW(),
        updated_at = NOW();
END;
$$;