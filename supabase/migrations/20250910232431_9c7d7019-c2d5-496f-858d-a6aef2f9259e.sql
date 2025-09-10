-- Link coffee products to their corresponding recipes for proper inventory deduction
-- This fixes the issue where products had recipe_id = NULL preventing inventory tracking

UPDATE products 
SET recipe_id = 'd500947f-14b0-4986-851d-6972c6889597'
WHERE id = '73c9ce68-6e91-414e-88c1-0648b5dcf460' 
  AND name = 'Americano Hot';

UPDATE products 
SET recipe_id = '4a2cf86a-daf6-4b46-8fdc-bbd2fcb91254'
WHERE id = 'a1d7d5b6-5465-4ec7-889c-8a21d361972f' 
  AND name = 'Cafe Latte Hot';

UPDATE products 
SET recipe_id = '8a9325a1-91a1-4f3e-b4b7-5160c13e20b4'
WHERE id = 'ff3e171b-46c3-4d91-92a1-340dc98c1479' 
  AND name = 'Cafe Mocha Hot';

UPDATE products 
SET recipe_id = '03c0cba9-b058-4af2-b16c-4b5980a944a3'
WHERE id = 'edc33884-1233-4085-bbe3-2f4627692bb2' 
  AND name = 'Cappuccino Hot';

UPDATE products 
SET recipe_id = '8ae5cd12-db7d-4630-bec8-23e4fc547b18'
WHERE id = '4f860316-051f-4fa5-bff0-c1039b3d30f3' 
  AND name = 'Caramel Latte Hot';

-- Verification: Check that all coffee products now have recipe links
SELECT 
  p.name as product_name,
  p.recipe_id,
  r.name as recipe_name,
  COUNT(ri.id) as ingredient_count,
  CASE 
    WHEN p.recipe_id IS NULL THEN 'MISSING RECIPE LINK'
    WHEN r.id IS NULL THEN 'INVALID RECIPE REFERENCE'
    WHEN COUNT(ri.id) = 0 THEN 'RECIPE HAS NO INGREDIENTS'
    ELSE 'PROPERLY LINKED'
  END as link_status
FROM products p
LEFT JOIN recipes r ON p.recipe_id = r.id
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
WHERE p.name IN ('Americano Hot', 'Cafe Latte Hot', 'Cafe Mocha Hot', 'Cappuccino Hot', 'Caramel Latte Hot')
  AND p.store_id = (SELECT id FROM stores WHERE name = 'Sugbo Mercado' LIMIT 1)
GROUP BY p.id, p.name, p.recipe_id, r.name
ORDER BY p.name;