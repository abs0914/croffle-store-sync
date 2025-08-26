-- Update Choco Marshmallow Croffle price to PHP 125

UPDATE products 
SET price = 125, updated_at = NOW()
WHERE name ILIKE '%choco marshmallow croffle%' OR name ILIKE '%choco marshmallow%';

UPDATE product_catalog 
SET price = 125, updated_at = NOW()
WHERE product_name ILIKE '%choco marshmallow croffle%' OR product_name ILIKE '%choco marshmallow%';

UPDATE recipe_templates 
SET suggested_price = 125, updated_at = NOW()
WHERE name ILIKE '%choco marshmallow croffle%' OR name ILIKE '%choco marshmallow%';