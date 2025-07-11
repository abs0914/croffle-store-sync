-- Fix recipe deployment by allowing null product_id initially
-- The product_id will be set later when products are created from recipes

ALTER TABLE public.recipes 
ALTER COLUMN product_id DROP NOT NULL;

-- Add a comment to clarify the purpose
COMMENT ON COLUMN public.recipes.product_id IS 'Product ID - can be null initially and set later when product is created from recipe';