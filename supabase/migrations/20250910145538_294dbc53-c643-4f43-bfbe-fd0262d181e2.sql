-- Comprehensive Pricing Fix: Update Recipe Templates and Product Catalog
-- Fix the specific pricing issues mentioned by the user

-- Step 1: Update Recipe Template Suggested Prices
UPDATE recipe_templates 
SET 
  suggested_price = 65.00,
  updated_at = NOW()
WHERE name = 'Mini Croffle' AND is_active = true;

UPDATE recipe_templates 
SET 
  suggested_price = 95.00,
  updated_at = NOW()
WHERE name = 'Croffle Overload' AND is_active = true;

UPDATE recipe_templates 
SET 
  suggested_price = 125.00,
  updated_at = NOW()
WHERE name = 'Regular Croffle' AND is_active = true;

-- Step 2: Update Product Catalog entries to match template suggested prices
-- This ensures all stores have consistent pricing

-- Update Mini Croffle products
UPDATE product_catalog 
SET 
  price = 65.00,
  updated_at = NOW()
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
WHERE product_catalog.recipe_id = r.id 
  AND rt.name = 'Mini Croffle'
  AND product_catalog.is_available = true;

-- Update Croffle Overload products  
UPDATE product_catalog 
SET 
  price = 95.00,
  updated_at = NOW()
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
WHERE product_catalog.recipe_id = r.id 
  AND rt.name = 'Croffle Overload'
  AND product_catalog.is_available = true;

-- Update Regular Croffle products
UPDATE product_catalog 
SET 
  price = 125.00,
  updated_at = NOW()
FROM recipes r  
JOIN recipe_templates rt ON r.template_id = rt.id
WHERE product_catalog.recipe_id = r.id 
  AND rt.name = 'Regular Croffle'
  AND product_catalog.is_available = true;

-- Step 3: Update all other products to match their template suggested prices
-- This fixes any other products that may have cost-based pricing issues
UPDATE product_catalog 
SET 
  price = rt.suggested_price,
  updated_at = NOW()
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
WHERE product_catalog.recipe_id = r.id 
  AND product_catalog.is_available = true
  AND rt.suggested_price IS NOT NULL
  AND rt.suggested_price > 0
  AND product_catalog.price != rt.suggested_price;

-- Verification query to show the updated pricing
SELECT 
  'UPDATED PRICING VERIFICATION' as report_type,
  rt.name as product_name,
  rt.suggested_price as template_price,
  COUNT(DISTINCT pc.store_id) as stores_updated,
  COUNT(pc.id) as total_catalog_entries,
  MIN(pc.price) as min_catalog_price,
  MAX(pc.price) as max_catalog_price,
  CASE 
    WHEN MIN(pc.price) = MAX(pc.price) AND MIN(pc.price) = rt.suggested_price 
    THEN 'CONSISTENT' 
    ELSE 'INCONSISTENT' 
  END as price_status
FROM recipe_templates rt
JOIN recipes r ON r.template_id = rt.id
JOIN product_catalog pc ON pc.recipe_id = r.id
WHERE rt.name IN ('Mini Croffle', 'Croffle Overload', 'Regular Croffle')
  AND rt.is_active = true
  AND pc.is_available = true
GROUP BY rt.name, rt.suggested_price
ORDER BY rt.name;