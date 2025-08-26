-- Add unique constraint on store_id for bir_cumulative_sales table
-- This is needed for the ON CONFLICT clause in update_cumulative_sales() function

ALTER TABLE public.bir_cumulative_sales 
ADD CONSTRAINT bir_cumulative_sales_store_id_unique UNIQUE (store_id);