-- Fix RLS policies for bir_cumulative_sales table to resolve transaction failures

-- Add RLS policies for bir_cumulative_sales table
CREATE POLICY "Users can view cumulative sales for accessible stores" 
ON public.bir_cumulative_sales 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true 
    AND (
      au.role IN ('admin', 'owner') 
      OR bir_cumulative_sales.store_id = ANY(au.store_ids)
    )
  )
);

-- Allow system to insert cumulative sales (needed for transaction triggers)
CREATE POLICY "System can insert cumulative sales" 
ON public.bir_cumulative_sales 
FOR INSERT 
WITH CHECK (true);

-- Allow system to update cumulative sales (needed for transaction triggers)
CREATE POLICY "System can update cumulative sales" 
ON public.bir_cumulative_sales 
FOR UPDATE 
USING (true);

-- Allow admins and owners to delete cumulative sales (for data management)
CREATE POLICY "Admins and owners can delete cumulative sales" 
ON public.bir_cumulative_sales 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true 
    AND au.role IN ('admin', 'owner')
  )
);

-- Make the update_cumulative_sales function SECURITY DEFINER to bypass RLS during trigger execution
CREATE OR REPLACE FUNCTION public.update_cumulative_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update cumulative sales record for the store
  INSERT INTO public.bir_cumulative_sales (
    store_id,
    grand_total_sales,
    grand_total_transactions,
    last_transaction_date,
    last_receipt_number,
    created_at,
    updated_at
  ) VALUES (
    NEW.store_id,
    NEW.total,
    1,
    NEW.created_at,
    NEW.receipt_number,
    NOW(),
    NOW()
  )
  ON CONFLICT (store_id) DO UPDATE SET
    grand_total_sales = bir_cumulative_sales.grand_total_sales + NEW.total,
    grand_total_transactions = bir_cumulative_sales.grand_total_transactions + 1,
    last_transaction_date = NEW.created_at,
    last_receipt_number = NEW.receipt_number,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$;