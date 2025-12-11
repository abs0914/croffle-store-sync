-- Fix Strawberry Latte display: Consolidate "Blended Drinks" into "Blended" category

-- Step 1: Move products in product_catalog from "Blended Drinks" to "Blended"
UPDATE product_catalog 
SET category_id = '37ad6cc1-e2ab-450d-aa25-9eba2f218a25'  -- Blended
WHERE store_id = 'c3bfe728-1550-4f4d-af04-12899f3b276b'   -- SM City Cebu
  AND category_id = 'f1062813-31d1-4967-90fa-f207b0c5a8f7';  -- Blended Drinks

-- Step 2: Move products in products table from "Blended Drinks" to "Blended"
UPDATE products 
SET category_id = '37ad6cc1-e2ab-450d-aa25-9eba2f218a25'  -- Blended
WHERE store_id = 'c3bfe728-1550-4f4d-af04-12899f3b276b'   -- SM City Cebu
  AND category_id = 'f1062813-31d1-4967-90fa-f207b0c5a8f7';  -- Blended Drinks

-- Step 3: Delete the duplicate "Blended Drinks" category
DELETE FROM categories 
WHERE id = 'f1062813-31d1-4967-90fa-f207b0c5a8f7';