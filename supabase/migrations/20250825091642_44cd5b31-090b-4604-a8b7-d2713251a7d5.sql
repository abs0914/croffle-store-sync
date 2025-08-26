-- Clean up duplicate entries in bir_cumulative_sales and add unique constraint

-- First, delete duplicate entries, keeping only the most recent one per store
DELETE FROM public.bir_cumulative_sales 
WHERE id NOT IN (
  SELECT DISTINCT ON (store_id) id
  FROM public.bir_cumulative_sales
  ORDER BY store_id, updated_at DESC
);

-- Now add the unique constraint
ALTER TABLE public.bir_cumulative_sales 
ADD CONSTRAINT bir_cumulative_sales_store_id_unique UNIQUE (store_id);