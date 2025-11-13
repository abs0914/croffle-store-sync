
-- Remove problematic Mini Croffle Base product (has empty recipe)
-- Set to unavailable so it won't appear in POS
UPDATE product_catalog
SET is_available = false, updated_at = NOW()
WHERE product_name = 'Mini Croffle Base'
AND store_id = 'c3bfe728-1550-4f4d-af04-12899f3b276b';

-- Also deactivate the empty recipe
UPDATE recipes
SET is_active = false, updated_at = NOW()
WHERE id = '623ad541-d84a-4df5-9e10-16edf742a1bf'
AND name = 'Mini Croffle Base';
