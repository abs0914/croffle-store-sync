-- Fix duplicate category issues and data inconsistencies for Robinsons North store
-- First, let's consolidate duplicate categories and fix misplaced products

-- 1. Move products from duplicate "Add-ons" categories to the active "Add-on" category
UPDATE products 
SET category_id = '43ac5f7c-a432-4083-a6fa-b9366a6241d9' -- Active "Add-on" category
WHERE store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND category_id = '0249f78a-a6dc-4154-9e61-e19ddbb4b412'; -- Inactive "Add-ons" category

-- 2. Deactivate duplicate/unused categories for this store
UPDATE categories 
SET is_active = false 
WHERE store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86' 
  AND id IN (
    '59623ce7-9baf-4ee8-a49d-b223d5674431', -- addon
    '0249f78a-a6dc-4154-9e61-e19ddbb4b412', -- Add-ons (duplicate)
    'ea283d40-1ce8-468c-947f-8224956e28be', -- beverages
    'fb757a35-4424-42ab-bf61-98faabe326ed', -- croffle_overload
    'ca09a15b-e3ea-4827-a029-270cd9e1fd3d', -- Croffle Overload
    '8ff30442-c130-40ed-b840-13e1fda5c0c5', -- espresso
    'a234f147-73ea-44a5-ae9d-0c70c82acb07', -- Mini
    '4f10e5d5-f5f6-4a1f-854e-09267e69c631', -- mini_croffle
    '78dd4cfb-1221-4194-9fc4-007b1f3e55bd', -- Mini Croffle (duplicate)
    '721c2314-e981-4c22-9e9f-a99c54326485'  -- Overload
  );

-- 3. Fix products that are incorrectly categorized - move from duplicate "Classic" to main "Classic"
-- First identify and move products from duplicate classic categories
UPDATE products 
SET category_id = 'dd198c48-fda6-44bc-b27d-4dd5aa44bbc9' -- Main Classic category
WHERE store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND category_id = 'be26eb13-0723-4a17-a516-657c2a96692d'; -- Duplicate Classic category

-- 4. Remove the duplicate Classic category
UPDATE categories 
SET is_active = false 
WHERE store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86' 
  AND id = 'be26eb13-0723-4a17-a516-657c2a96692d'; -- Duplicate Classic

-- 5. Fix products that are incorrectly categorized - move from duplicate "Add-ons" to main "Add-on"
UPDATE products 
SET category_id = '43ac5f7c-a432-4083-a6fa-b9366a6241d9' -- Active "Add-on" category
WHERE store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND category_id = '8a860f1b-c72f-4b0e-8bd3-906234c99e4d'; -- Another duplicate Add-ons category

-- 6. Deactivate the other duplicate Add-ons category
UPDATE categories 
SET is_active = false 
WHERE store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86' 
  AND id = '8a860f1b-c72f-4b0e-8bd3-906234c99e4d'; -- Another duplicate Add-ons

-- 7. Ensure all "Biscoff Crushed" products are in Add-on category
UPDATE products 
SET category_id = '43ac5f7c-a432-4083-a6fa-b9366a6241d9' -- Active "Add-on" category
WHERE store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND name ILIKE '%biscoff%crushed%';

-- 8. Clean up any orphaned products by moving them to appropriate categories
-- This handles edge cases where products might be in non-existent or inactive categories