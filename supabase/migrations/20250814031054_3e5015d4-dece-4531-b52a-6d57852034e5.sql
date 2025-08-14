-- Fix security gaps with simpler migration (no concurrent indexes)
-- Add RLS policies for secure access

-- Enable RLS on critical tables that were missing policies
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for shifts table
CREATE POLICY "shifts_select_policy" ON public.shifts
    FOR SELECT USING (
        -- Users can view shifts for stores they have access to
        is_store_accessible(store_id)
    );

CREATE POLICY "shifts_insert_policy" ON public.shifts
    FOR INSERT WITH CHECK (
        -- Users can create shifts for stores they have access to
        is_store_accessible(store_id)
    );

CREATE POLICY "shifts_update_policy" ON public.shifts
    FOR UPDATE USING (
        -- Users can update their own shifts or if they have store access
        auth.uid() = user_id OR is_store_accessible(store_id)
    );

-- Create RLS policies for expenses table
CREATE POLICY "expenses_select_policy" ON public.expenses
    FOR SELECT USING (
        -- Users can view expenses for stores they have access to
        is_store_accessible(store_id)
    );

CREATE POLICY "expenses_insert_policy" ON public.expenses
    FOR INSERT WITH CHECK (
        -- Users can create expenses for stores they have access to
        is_store_accessible(store_id)
    );

CREATE POLICY "expenses_update_policy" ON public.expenses
    FOR UPDATE USING (
        -- Users can update expenses for stores they have access to
        is_store_accessible(store_id)
    );

-- Create RLS policies for purchase_orders table
CREATE POLICY "purchase_orders_select_policy" ON public.purchase_orders
    FOR SELECT USING (
        -- Users can view purchase orders for stores they have access to
        is_store_accessible(store_id)
    );

CREATE POLICY "purchase_orders_insert_policy" ON public.purchase_orders
    FOR INSERT WITH CHECK (
        -- Users can create purchase orders for stores they have access to
        is_store_accessible(store_id)
    );

CREATE POLICY "purchase_orders_update_policy" ON public.purchase_orders
    FOR UPDATE USING (
        -- Users can update purchase orders for stores they have access to
        is_store_accessible(store_id)
    );

-- Enhance transaction security
CREATE POLICY "transactions_delete_policy" ON public.transactions
    FOR DELETE USING (
        -- Only admins/owners can delete transactions, and only for rollback purposes
        is_current_user_admin_or_owner() AND 
        -- Only allow deletion within 1 hour of creation for rollback scenarios
        created_at > (NOW() - INTERVAL '1 hour')
    );

-- Create function to validate inventory transaction integrity
CREATE OR REPLACE FUNCTION validate_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure transaction has valid store access
    IF NOT is_store_accessible(NEW.store_id) THEN
        RAISE EXCEPTION 'Access denied to store inventory';
    END IF;
    
    -- Prevent negative inventory (safety check)
    IF NEW.new_quantity < 0 THEN
        RAISE EXCEPTION 'Inventory cannot be negative';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for inventory transaction validation
DROP TRIGGER IF EXISTS validate_inventory_transaction_trigger ON public.inventory_transactions;
CREATE TRIGGER validate_inventory_transaction_trigger
    BEFORE INSERT ON public.inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION validate_inventory_transaction();

-- Create function for secure transaction rollback
CREATE OR REPLACE FUNCTION secure_transaction_rollback(transaction_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    transaction_record RECORD;
    can_rollback BOOLEAN := FALSE;
BEGIN
    -- Get transaction details
    SELECT * INTO transaction_record
    FROM public.transactions
    WHERE id = transaction_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;
    
    -- Check if user can rollback this transaction
    IF is_current_user_admin_or_owner() OR 
       (auth.uid() = transaction_record.user_id AND 
        transaction_record.created_at > (NOW() - INTERVAL '1 hour')) THEN
        can_rollback := TRUE;
    END IF;
    
    IF NOT can_rollback THEN
        RAISE EXCEPTION 'Not authorized to rollback this transaction';
    END IF;
    
    -- Mark transaction as voided
    UPDATE public.transactions
    SET status = 'voided',
        updated_at = NOW()
    WHERE id = transaction_id;
    
    -- Log the rollback action
    INSERT INTO public.bir_audit_logs (
        store_id, log_type, event_name, event_data, user_id,
        transaction_id, created_at
    ) VALUES (
        transaction_record.store_id,
        'transaction',
        'Transaction Rollback',
        jsonb_build_object(
            'original_total', transaction_record.total,
            'rollback_reason', 'System rollback',
            'rollback_timestamp', NOW()
        ),
        auth.uid(),
        transaction_id,
        NOW()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable real-time for inventory monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;