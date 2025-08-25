-- Drop the existing trigger that calls update_cumulative_sales incorrectly
DROP TRIGGER IF EXISTS trigger_update_cumulative_sales ON transactions;

-- Create a new trigger function that properly calls update_cumulative_sales with parameters
CREATE OR REPLACE FUNCTION public.trigger_update_cumulative_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only update cumulative sales for completed transactions
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        PERFORM public.update_cumulative_sales(
            NEW.store_id,
            NEW.total,
            NEW.receipt_number,
            'TERMINAL-01'  -- Default terminal ID since transactions don't have terminal_id field
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the new trigger
CREATE TRIGGER trigger_update_cumulative_sales
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_cumulative_sales();