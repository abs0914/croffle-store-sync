-- Continue adding ingredients for coffee and beverage recipes
-- Add basic coffee ingredients for coffee-based products

INSERT INTO recipe_ingredients (recipe_id, inventory_stock_id, quantity, unit, created_at)
SELECT 
  r.id as recipe_id,
  ist.id as inventory_stock_id,
  CASE 
    -- Coffee recipes need coffee base
    WHEN LOWER(r.name) LIKE '%americano%' OR LOWER(r.name) LIKE '%espresso%' THEN 1.0
    WHEN LOWER(r.name) LIKE '%latte%' OR LOWER(r.name) LIKE '%cappuccino%' THEN 1.0
    WHEN LOWER(r.name) LIKE '%mocha%' THEN 1.0
    -- Other beverages
    WHEN LOWER(r.name) LIKE '%water%' THEN 1.0
    WHEN LOWER(r.name) LIKE '%tea%' THEN 1.0
    ELSE 1.0
  END as quantity,
  'pieces' as unit,
  now() as created_at
FROM recipes r
CROSS JOIN LATERAL (
  SELECT ist.id, ist.item, ist.store_id
  FROM inventory_stock ist 
  WHERE ist.is_active = true
  AND (
    -- Coffee products need coffee base ingredient
    ((LOWER(r.name) LIKE '%americano%' OR LOWER(r.name) LIKE '%espresso%' OR 
      LOWER(r.name) LIKE '%latte%' OR LOWER(r.name) LIKE '%cappuccino%' OR 
      LOWER(r.name) LIKE '%mocha%') AND LOWER(ist.item) LIKE '%coffee%')
    OR
    -- Water products
    (LOWER(r.name) LIKE '%water%' AND LOWER(ist.item) LIKE '%water%')
    OR
    -- Tea products  
    (LOWER(r.name) LIKE '%tea%' AND LOWER(ist.item) LIKE '%tea%')
    OR
    -- Matcha products
    (LOWER(r.name) LIKE '%matcha%' AND LOWER(ist.item) LIKE '%matcha%')
    OR
    -- Generic fallback for recipes that still have no ingredients
    (NOT EXISTS (
      SELECT 1 FROM inventory_stock ist2 
      WHERE ist2.is_active = true
      AND (
        (LOWER(r.name) LIKE '%' || LOWER(SPLIT_PART(ist2.item, ' ', 1)) || '%')
        OR
        (LOWER(ist2.item) LIKE '%' || LOWER(SPLIT_PART(r.name, ' ', 1)) || '%')
      )
    ) AND LOWER(ist.item) LIKE '%syrup%')
  )
  LIMIT 1
) ist
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_ingredients ri 
  WHERE ri.recipe_id = r.id
)
AND r.name IS NOT NULL
AND r.id IS NOT NULL;