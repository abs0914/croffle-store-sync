-- Fix product categorization - assign proper categories to products with NULL category_id

-- Update espresso drinks to Espresso category
UPDATE product_catalog 
SET category_id = (SELECT id FROM categories WHERE name = 'Espresso' AND store_id = product_catalog.store_id LIMIT 1)
WHERE category_id IS NULL 
  AND (
    product_name ILIKE '%americano%' OR
    product_name ILIKE '%café latte%' OR 
    product_name ILIKE '%café mocha%' OR
    product_name ILIKE '%cappuccino%' OR
    product_name ILIKE '%caramel latte%' OR
    product_name ILIKE '%espresso%'
  );

-- Update beverages to Beverages category
UPDATE product_catalog 
SET category_id = (SELECT id FROM categories WHERE name = 'Beverages' AND store_id = product_catalog.store_id LIMIT 1)
WHERE category_id IS NULL 
  AND (
    product_name ILIKE '%coke%' OR
    product_name ILIKE '%sprite%' OR 
    product_name ILIKE '%bottled water%' OR
    product_name ILIKE '%water%' OR
    product_name ILIKE '%juice%' OR
    product_name ILIKE '%soda%'
  );

-- Update add-ons and toppings to Add-ons category
UPDATE product_catalog 
SET category_id = (SELECT id FROM categories WHERE name = 'Add-ons' AND store_id = product_catalog.store_id LIMIT 1)
WHERE category_id IS NULL 
  AND (
    product_name ILIKE '%caramel%' OR
    product_name ILIKE '%chocolate%' OR
    product_name ILIKE '%choco flakes%' OR
    product_name ILIKE '%colored sprinkles%' OR
    product_name ILIKE '%marshmallow%' OR
    product_name ILIKE '%oreo%' OR
    product_name ILIKE '%peanut%' OR
    product_name ILIKE '%crushed%' OR
    product_name ILIKE '%cookies%' OR
    product_name ILIKE '%flakes%'
  );

-- Update packaging items to Add-ons category  
UPDATE product_catalog 
SET category_id = (SELECT id FROM categories WHERE name = 'Add-ons' AND store_id = product_catalog.store_id LIMIT 1)
WHERE category_id IS NULL 
  AND (
    product_name ILIKE '%paper bag%' OR
    product_name ILIKE '%take-out box%' OR
    product_name ILIKE '%rectangle%' OR
    product_name ILIKE '%bag%' OR
    product_name ILIKE '%box%' OR
    product_name ILIKE '%container%'
  );

-- Verify the updates
SELECT 
  c.name as category_name,
  COUNT(pc.id) as product_count,
  ARRAY_AGG(pc.product_name ORDER BY pc.product_name) as products
FROM product_catalog pc
LEFT JOIN categories c ON pc.category_id = c.id
WHERE pc.store_id = (SELECT id FROM stores WHERE name = 'Robinsons North' LIMIT 1)
GROUP BY c.name
ORDER BY c.name;