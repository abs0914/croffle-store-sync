-- Consolidate "Popsicle" -> "Popsicle Stick" at Sugbo Mercado
-- Store ID: d7c47e6b-f20a-4543-a6bd-000398f72df5
-- Existing IDs (from prior inspection):
--   Popsicle (old): c7e95ff0-c496-4882-b1c4-ce59e17233fc (packaging)
--   Popsicle Stick (new): 65be164c-10d2-4f06-b88f-7e23890357c3 (current category may vary)

BEGIN;

-- 1) Update recipe_ingredients mappings to point to "Popsicle Stick"
UPDATE recipe_ingredients ri
SET inventory_stock_id = '65be164c-10d2-4f06-b88f-7e23890357c3',
    updated_at = NOW()
FROM recipes r
WHERE ri.recipe_id = r.id
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ri.inventory_stock_id = 'c7e95ff0-c496-4882-b1c4-ce59e17233fc';

-- 2) Update product_ingredients mappings to point to "Popsicle Stick"
UPDATE product_ingredients pi
SET inventory_stock_id = '65be164c-10d2-4f06-b88f-7e23890357c3'
FROM product_catalog pc
WHERE pi.product_catalog_id = pc.id
  AND pc.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND pi.inventory_stock_id = 'c7e95ff0-c496-4882-b1c4-ce59e17233fc';

-- 3) Update recipe_ingredient_mappings if present
UPDATE recipe_ingredient_mappings rim
SET inventory_stock_id = '65be164c-10d2-4f06-b88f-7e23890357c3',
    updated_at = NOW()
FROM recipes r
WHERE rim.recipe_id = r.id
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND rim.inventory_stock_id = 'c7e95ff0-c496-4882-b1c4-ce59e17233fc';

-- 4) Deactivate the old "Popsicle" inventory item to prevent future use
UPDATE inventory_stock
SET is_active = false, updated_at = NOW()
WHERE id = 'c7e95ff0-c496-4882-b1c4-ce59e17233fc'
  AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

COMMIT;

-- Verification
-- A) Confirm no recipe_ingredients or product_ingredients reference the old item
SELECT 
  'recipe_ingredients' as table, COUNT(*) as remaining
FROM recipe_ingredients ri
JOIN recipes r ON r.id = ri.recipe_id
WHERE r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ri.inventory_stock_id = 'c7e95ff0-c496-4882-b1c4-ce59e17233fc'
UNION ALL
SELECT 
  'product_ingredients' as table, COUNT(*) as remaining
FROM product_ingredients pi
JOIN product_catalog pc ON pc.id = pi.product_catalog_id
WHERE pc.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND pi.inventory_stock_id = 'c7e95ff0-c496-4882-b1c4-ce59e17233fc';

-- B) Show active Popsicle-related inventory items post-consolidation
SELECT id, item, item_category, is_active
FROM inventory_stock
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND item ILIKE '%popsicle%'
ORDER BY item;