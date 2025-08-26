-- Fix "Café" to "Cafe" across all database tables to resolve CSV export issues

-- Update recipe_templates table
UPDATE recipe_templates 
SET name = REPLACE(name, 'Café', 'Cafe')
WHERE name LIKE '%Café%';

-- Update products table
UPDATE products 
SET name = REPLACE(REPLACE(name, 'Café', 'Cafe'), 'CAFÉ', 'Cafe'),
    description = REPLACE(REPLACE(description, 'Café', 'Cafe'), 'CAFÉ', 'Cafe')
WHERE name LIKE '%Café%' OR name LIKE '%CAFÉ%' OR description LIKE '%Café%' OR description LIKE '%CAFÉ%';

-- Update product_catalog table
UPDATE product_catalog 
SET product_name = REPLACE(product_name, 'Café', 'Cafe'),
    description = REPLACE(description, 'Café', 'Cafe')
WHERE product_name LIKE '%Café%' OR description LIKE '%Café%';

-- Update transactions table - fix items JSON field
UPDATE transactions 
SET items = REPLACE(items::text, 'Café', 'Cafe')::jsonb
WHERE items::text LIKE '%Café%';