-- Remove the incorrect "Matcha Frappe" product

-- First, remove the product catalog entry
DELETE FROM product_catalog 
WHERE LOWER(product_name) LIKE '%matcha frappe%';

-- Clean up any auto-generated template if it exists
DELETE FROM recipe_templates 
WHERE LOWER(name) LIKE '%matcha frappe%'
  AND description LIKE '%Auto-generated%';

-- Clean up any orphaned recipes that were created for this product
DELETE FROM recipes 
WHERE name LIKE '%Matcha Frappe%'
  AND instructions LIKE '%Auto-generated%';