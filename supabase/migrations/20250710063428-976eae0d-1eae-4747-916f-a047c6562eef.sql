-- Clear all remaining product data
-- Delete in order to respect foreign key constraints

-- Clear product variations first (references products)
DELETE FROM public.product_variations;

-- Clear any transaction items that reference products
DELETE FROM public.transaction_items;

-- Clear main products table
DELETE FROM public.products;

-- Clear any recipe-related product data
UPDATE public.recipes SET product_id = NULL WHERE product_id IS NOT NULL;

-- Verification queries to confirm clean state
SELECT 
  (SELECT COUNT(*) FROM products) as products_count,
  (SELECT COUNT(*) FROM product_variations) as product_variations_count,
  (SELECT COUNT(*) FROM transaction_items) as transaction_items_count,
  (SELECT COUNT(*) FROM recipes WHERE product_id IS NOT NULL) as recipes_with_products_count;