-- Update Choco Nut Croffle price to PHP 125

UPDATE products 
SET price = 125, updated_at = NOW()
WHERE name ILIKE '%choco nut croffle%' OR name ILIKE '%choco nut%';

UPDATE product_catalog 
SET price = 125, updated_at = NOW()
WHERE product_name ILIKE '%choco nut croffle%' OR product_name ILIKE '%choco nut%';

UPDATE recipe_templates 
SET suggested_price = 125, updated_at = NOW()
WHERE name ILIKE '%choco nut croffle%' OR name ILIKE '%choco nut%';