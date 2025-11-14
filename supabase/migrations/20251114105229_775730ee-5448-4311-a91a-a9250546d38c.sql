
-- Remove Premium - Kitkat, Premium - Biscoff, and Premium - Nutella from all stores
DELETE FROM product_catalog
WHERE product_name IN ('Premium - Kitkat', 'Premium - Biscoff', 'Premium - Nutella');
