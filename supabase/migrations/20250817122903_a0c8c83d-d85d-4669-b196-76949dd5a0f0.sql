-- Remove all incorrect product_ingredients entries for Americano (Iced) products
-- These are leftover from migration and causing confusion

DELETE FROM product_ingredients 
WHERE product_catalog_id IN (
  SELECT id FROM product_catalog 
  WHERE product_name ILIKE '%americano%' AND product_name ILIKE '%iced%'
);