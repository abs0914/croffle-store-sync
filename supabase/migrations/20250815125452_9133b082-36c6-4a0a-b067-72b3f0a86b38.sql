-- Final comprehensive ingredient mapping for remaining recipes
-- Handle specific product types and generic fallbacks

INSERT INTO recipe_ingredients (recipe_id, inventory_stock_id, quantity, unit, created_at)
SELECT 
  r.id as recipe_id,
  ist.id as inventory_stock_id,
  1.0 as quantity,
  'pieces' as unit,
  now() as created_at
FROM recipes r
CROSS JOIN LATERAL (
  SELECT ist.id, ist.item, ist.store_id, 
         -- Score the match quality
         CASE 
           -- Exact product name matches get highest score
           WHEN LOWER(ist.item) LIKE '%' || LOWER(r.name) || '%' THEN 100
           WHEN LOWER(r.name) LIKE '%' || LOWER(ist.item) || '%' THEN 90
           -- Partial matches for specific product types
           WHEN LOWER(r.name) LIKE '%croffle%' AND LOWER(ist.item) LIKE '%waffle%' THEN 80
           WHEN LOWER(r.name) LIKE '%nutella%' AND LOWER(ist.item) LIKE '%nutella%' THEN 95
           WHEN LOWER(r.name) LIKE '%kitkat%' AND LOWER(ist.item) LIKE '%kitkat%' THEN 95
           WHEN LOWER(r.name) LIKE '%oreo%' AND LOWER(ist.item) LIKE '%oreo%' THEN 95
           WHEN LOWER(r.name) LIKE '%coke%' AND LOWER(ist.item) LIKE '%coke%' THEN 95
           WHEN LOWER(r.name) LIKE '%sprite%' AND LOWER(ist.item) LIKE '%sprite%' THEN 95
           WHEN LOWER(r.name) LIKE '%marshmallow%' AND LOWER(ist.item) LIKE '%marshmallow%' THEN 95
           WHEN LOWER(r.name) LIKE '%sprinkles%' AND LOWER(ist.item) LIKE '%sprinkles%' THEN 95
           -- Chocolate variations
           WHEN LOWER(r.name) LIKE '%choco%' AND LOWER(ist.item) LIKE '%choco%' THEN 85
           WHEN LOWER(r.name) LIKE '%chocolate%' AND LOWER(ist.item) LIKE '%chocolate%' THEN 85
           -- Tiramisu and specialty items
           WHEN LOWER(r.name) LIKE '%tiramisu%' AND LOWER(ist.item) LIKE '%tiramisu%' THEN 95
           -- Peanut products
           WHEN LOWER(r.name) LIKE '%peanut%' AND LOWER(ist.item) LIKE '%peanut%' THEN 85
           -- Caramel products  
           WHEN LOWER(r.name) LIKE '%caramel%' AND LOWER(ist.item) LIKE '%caramel%' THEN 85
           -- Generic base ingredients for croffles
           WHEN LOWER(r.name) LIKE '%croffle%' AND LOWER(ist.item) LIKE '%waffle%base%' THEN 70
           WHEN LOWER(r.name) LIKE '%croffle%' AND LOWER(ist.item) LIKE '%mix%' THEN 60
           -- Very generic fallback - any syrup for recipes without specific matches
           WHEN LOWER(ist.item) LIKE '%syrup%' THEN 30
           WHEN LOWER(ist.item) LIKE '%sauce%' THEN 25
           ELSE 0
         END as match_score
  FROM inventory_stock ist 
  WHERE ist.is_active = true
  AND ist.store_id = r.store_id  -- Only match items from the same store
  AND (
    -- High confidence matches
    LOWER(ist.item) LIKE '%' || LOWER(r.name) || '%'
    OR LOWER(r.name) LIKE '%' || LOWER(ist.item) || '%'
    OR (LOWER(r.name) LIKE '%nutella%' AND LOWER(ist.item) LIKE '%nutella%')
    OR (LOWER(r.name) LIKE '%kitkat%' AND LOWER(ist.item) LIKE '%kitkat%')
    OR (LOWER(r.name) LIKE '%oreo%' AND LOWER(ist.item) LIKE '%oreo%')
    OR (LOWER(r.name) LIKE '%coke%' AND LOWER(ist.item) LIKE '%coke%')
    OR (LOWER(r.name) LIKE '%sprite%' AND LOWER(ist.item) LIKE '%sprite%')
    OR (LOWER(r.name) LIKE '%marshmallow%' AND LOWER(ist.item) LIKE '%marshmallow%')
    OR (LOWER(r.name) LIKE '%sprinkles%' AND LOWER(ist.item) LIKE '%sprinkles%')
    OR (LOWER(r.name) LIKE '%choco%' AND LOWER(ist.item) LIKE '%choco%')
    OR (LOWER(r.name) LIKE '%chocolate%' AND LOWER(ist.item) LIKE '%chocolate%')
    OR (LOWER(r.name) LIKE '%tiramisu%' AND LOWER(ist.item) LIKE '%tiramisu%')
    OR (LOWER(r.name) LIKE '%peanut%' AND LOWER(ist.item) LIKE '%peanut%')
    OR (LOWER(r.name) LIKE '%caramel%' AND LOWER(ist.item) LIKE '%caramel%')
    -- Fallback matches
    OR (LOWER(r.name) LIKE '%croffle%' AND LOWER(ist.item) LIKE '%waffle%')
    OR (LOWER(r.name) LIKE '%croffle%' AND LOWER(ist.item) LIKE '%mix%')
    -- Last resort - any sauce/syrup for recipes with no better match
    OR (NOT EXISTS (
      SELECT 1 FROM inventory_stock ist2
      WHERE ist2.store_id = r.store_id 
      AND ist2.is_active = true
      AND (
        LOWER(ist2.item) LIKE '%' || LOWER(r.name) || '%'
        OR LOWER(r.name) LIKE '%' || LOWER(ist2.item) || '%'
      )
    ) AND (LOWER(ist.item) LIKE '%syrup%' OR LOWER(ist.item) LIKE '%sauce%'))
  )
  ORDER BY match_score DESC, ist.item
  LIMIT 1
) ist
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_ingredients ri 
  WHERE ri.recipe_id = r.id
)
AND r.name IS NOT NULL
AND r.id IS NOT NULL
AND r.store_id IS NOT NULL;