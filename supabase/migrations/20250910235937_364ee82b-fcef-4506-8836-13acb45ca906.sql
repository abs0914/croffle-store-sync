-- Fix data integrity issue: Create missing products and link them to existing recipes
-- This addresses Transaction #20250911-1672-075317 which references non-existent product IDs

-- Issue: Transaction references product IDs that don't exist in the products table
-- Solution: Create these products and link them to existing recipes

-- Create missing Americano Hot product
INSERT INTO products (
  id, name, store_id, recipe_id, price, is_active, created_at, updated_at
) VALUES (
  'aa18729f-55f8-4021-a809-b974049fe8ff',
  'Americano Hot',
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  'd500947f-14b0-4986-851d-6972c6889597',
  65.00,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  recipe_id = 'd500947f-14b0-4986-851d-6972c6889597',
  updated_at = NOW();

-- Create missing Cafe Latte Hot product  
INSERT INTO products (
  id, name, store_id, recipe_id, price, is_active, created_at, updated_at
) VALUES (
  'e3353517-4bd5-4470-b2b0-b90372ec4600',
  'Cafe Latte Hot',
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  '4a2cf86a-daf6-4b46-8fdc-bbd2fcb91254',
  65.00,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  recipe_id = '4a2cf86a-daf6-4b46-8fdc-bbd2fcb91254',
  updated_at = NOW();

-- Create missing Cafe Mocha Hot product
INSERT INTO products (
  id, name, store_id, recipe_id, price, is_active, created_at, updated_at
) VALUES (
  '8062b25d-a74a-49d2-865a-eb0d50819665',
  'Cafe Mocha Hot',
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  '8a9325a1-91a1-4f3e-b4b7-5160c13e20b4',
  65.00,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  recipe_id = '8a9325a1-91a1-4f3e-b4b7-5160c13e20b4',
  updated_at = NOW();

-- Create missing Cappuccino Hot product
INSERT INTO products (
  id, name, store_id, recipe_id, price, is_active, created_at, updated_at
) VALUES (
  'ee9c8753-51cb-4852-a7ab-df2eca6e503e',
  'Cappuccino Hot',
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  '03c0cba9-b058-4af2-b16c-4b5980a944a3',
  65.00,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  recipe_id = '03c0cba9-b058-4af2-b16c-4b5980a944a3',
  updated_at = NOW();

-- Create missing Caramel Latte Hot product
INSERT INTO products (
  id, name, store_id, recipe_id, price, is_active, created_at, updated_at
) VALUES (
  '2096ea05-8315-422e-b746-91cc34929d86',
  'Caramel Latte Hot',
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  '8ae5cd12-db7d-4630-bec8-23e4fc547b18',
  90.00,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  recipe_id = '8ae5cd12-db7d-4630-bec8-23e4fc547b18',
  updated_at = NOW();

-- Verify the fix by checking the created products
SELECT 
  p.id,
  p.name,
  p.recipe_id,
  r.name as recipe_name,
  'CREATED/LINKED' as status
FROM products p
JOIN recipes r ON p.recipe_id = r.id
WHERE p.id IN (
  'aa18729f-55f8-4021-a809-b974049fe8ff',
  'e3353517-4bd5-4470-b2b0-b90372ec4600', 
  '8062b25d-a74a-49d2-865a-eb0d50819665',
  'ee9c8753-51cb-4852-a7ab-df2eca6e503e',
  '2096ea05-8315-422e-b746-91cc34929d86'
)
ORDER BY p.name;