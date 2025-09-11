-- Fix data integrity issue: Handle duplicate product references
-- This addresses Transaction #20250911-1672-075317 which references non-existent product IDs
-- while products with the same names already exist

-- Issue: Transaction references product IDs that don't exist, but products with same names exist
-- Solution: Update transaction items to use the correct existing product IDs

-- First, create a mapping table to track the correct product IDs
WITH product_mapping AS (
  SELECT 
    'aa18729f-55f8-4021-a809-b974049fe8ff'::uuid as old_id,
    '73c9ce68-6e91-414e-88c1-0648b5dcf460'::uuid as new_id,
    'Americano Hot' as product_name
  UNION ALL
  SELECT 
    'e3353517-4bd5-4470-b2b0-b90372ec4600'::uuid,
    'a1d7d5b6-5465-4ec7-889c-8a21d361972f'::uuid,
    'Cafe Latte Hot'
  UNION ALL
  SELECT 
    '8062b25d-a74a-49d2-865a-eb0d50819665'::uuid,
    'ff3e171b-46c3-4d91-92a1-340dc98c1479'::uuid,
    'Cafe Mocha Hot'
  UNION ALL
  SELECT 
    'ee9c8753-51cb-4852-a7ab-df2eca6e503e'::uuid,
    'edc33884-1233-4085-bbe3-2f4627692bb2'::uuid,
    'Cappuccino Hot'
  UNION ALL
  SELECT 
    '2096ea05-8315-422e-b746-91cc34929d86'::uuid,
    '4f860316-051f-4fa5-bff0-c1039b3d30f3'::uuid,
    'Caramel Latte Hot'
)
-- Update transaction items to use correct product IDs
UPDATE transaction_items 
SET product_id = pm.new_id,
    updated_at = NOW()
FROM product_mapping pm
WHERE transaction_items.product_id = pm.old_id
  AND transaction_items.transaction_id = '2fe02ef1-a426-4b74-8f52-208c60531e11';

-- Log the changes made
INSERT INTO cleanup_log (
  table_name,
  action,
  old_id,
  new_id,
  details,
  created_at
)
SELECT 
  'transaction_items' as table_name,
  'product_id_correction' as action,
  pm.old_id,
  pm.new_id,
  jsonb_build_object(
    'transaction_id', '2fe02ef1-a426-4b74-8f52-208c60531e11',
    'product_name', pm.product_name,
    'reason', 'Fixed invalid product ID references'
  ) as details,
  NOW()
FROM (
  SELECT 
    'aa18729f-55f8-4021-a809-b974049fe8ff'::uuid as old_id,
    '73c9ce68-6e91-414e-88c1-0648b5dcf460'::uuid as new_id,
    'Americano Hot' as product_name
  UNION ALL
  SELECT 
    'e3353517-4bd5-4470-b2b0-b90372ec4600'::uuid,
    'a1d7d5b6-5465-4ec7-889c-8a21d361972f'::uuid,
    'Cafe Latte Hot'
  UNION ALL
  SELECT 
    '8062b25d-a74a-49d2-865a-eb0d50819665'::uuid,
    'ff3e171b-46c3-4d91-92a1-340dc98c1479'::uuid,
    'Cafe Mocha Hot'
  UNION ALL
  SELECT 
    'ee9c8753-51cb-4852-a7ab-df2eca6e503e'::uuid,
    'edc33884-1233-4085-bbe3-2f4627692bb2'::uuid,
    'Cappuccino Hot'
  UNION ALL
  SELECT 
    '2096ea05-8315-422e-b746-91cc34929d86'::uuid,
    '4f860316-051f-4fa5-bff0-c1039b3d30f3'::uuid,
    'Caramel Latte Hot'
) pm;

-- Verify the fix by checking the updated transaction items
SELECT 
  ti.id as item_id,
  ti.product_id,
  ti.name as item_name,
  p.name as product_name,
  p.recipe_id,
  r.name as recipe_name,
  'FIXED' as status
FROM transaction_items ti
JOIN products p ON ti.product_id = p.id
LEFT JOIN recipes r ON p.recipe_id = r.id
WHERE ti.transaction_id = '2fe02ef1-a426-4b74-8f52-208c60531e11'
ORDER BY ti.name;