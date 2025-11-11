-- Fix Mini Croffle pricing and availability issues
-- Issue: Mini Croffle products in Mix & Match category showing zero price and grayed out

-- Step 1: Set proper price for Mini Croffle products in Mix & Match category (price 0.00 issue)
UPDATE product_catalog
SET price = 65.00
WHERE LOWER(product_name) = 'mini croffle'
  AND category_id IN (SELECT id FROM categories WHERE LOWER(name) = 'mix & match')
  AND price = 0.00;

-- Step 2: Enable all Mini Croffle Base products that are currently unavailable
UPDATE product_catalog
SET is_available = true
WHERE LOWER(product_name) = 'mini croffle base'
  AND is_available = false;

-- Step 3: Verify Mini Croffle products have proper pricing
-- All Mini Croffle products should have a base price of 65.00
UPDATE product_catalog
SET price = 65.00
WHERE LOWER(product_name) LIKE '%mini croffle%'
  AND price = 0.00;