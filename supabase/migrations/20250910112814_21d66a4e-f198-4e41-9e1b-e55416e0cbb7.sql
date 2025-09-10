-- Fix missing recipe ingredient mappings and deploy missing recipes

-- 1. Create missing recipe ingredient mapping for "Crushed Oreo"
INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor,
  created_at,
  updated_at
)
SELECT DISTINCT
  ri.recipe_id,
  ri.ingredient_name,
  '24a5d647-3f87-4a5e-bd73-a84536d01ef7'::uuid, -- Crushed Oreo inventory item
  1.0,
  NOW(),
  NOW()
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
WHERE ri.ingredient_name = 'Crushed Oreo'
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = ri.recipe_id 
      AND rim.ingredient_name = ri.ingredient_name
  );

-- 2. Create mappings for Mini Croffle ingredients
-- Map "Regular Croissant" to existing inventory item
INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor,
  created_at,
  updated_at
)
SELECT DISTINCT
  ri.recipe_id,
  ri.ingredient_name,
  ist.id,
  1.0,
  NOW(),
  NOW()
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN inventory_stock ist ON ist.store_id = r.store_id 
  AND LOWER(TRIM(ist.item)) LIKE '%croissant%'
WHERE ri.ingredient_name = 'Regular Croissant'
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = ri.recipe_id 
      AND rim.ingredient_name = ri.ingredient_name
  )
LIMIT 1;

-- Map "Whipped Cream" to existing inventory item
INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor,
  created_at,
  updated_at
)
SELECT DISTINCT
  ri.recipe_id,
  ri.ingredient_name,
  ist.id,
  1.0,
  NOW(),
  NOW()
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN inventory_stock ist ON ist.store_id = r.store_id 
  AND LOWER(TRIM(ist.item)) LIKE '%whipped cream%'
WHERE ri.ingredient_name = 'Whipped Cream'
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = ri.recipe_id 
      AND rim.ingredient_name = ri.ingredient_name
  )
LIMIT 1;

-- 3. Deploy missing "Croffle Overload" recipe to store
INSERT INTO recipes (
  name,
  store_id,
  template_id,
  is_active,
  serving_size,
  instructions,
  total_cost,
  cost_per_serving,
  created_at,
  updated_at
)
SELECT 
  rt.name,
  'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid,
  rt.id,
  true,
  COALESCE(rt.serving_size, 1),
  COALESCE(rt.instructions, 'Follow standard preparation instructions'),
  0,
  0,
  NOW(),
  NOW()
FROM recipe_templates rt
WHERE rt.id = 'a7554439-dea0-4310-8681-1b35a058361d'::uuid
  AND rt.name = 'Croffle Overload'
  AND NOT EXISTS (
    SELECT 1 FROM recipes r
    WHERE r.template_id = rt.id 
      AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
  );

-- 4. Add recipe ingredients for the new "Croffle Overload" recipe
WITH new_recipe AS (
  SELECT r.id as recipe_id
  FROM recipes r
  WHERE r.template_id = 'a7554439-dea0-4310-8681-1b35a058361d'::uuid
    AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
  LIMIT 1
)
INSERT INTO recipe_ingredients (
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  created_at,
  updated_at
)
SELECT 
  nr.recipe_id,
  rti.ingredient_name,
  rti.quantity,
  CASE 
    WHEN LOWER(rti.unit) = 'pieces' THEN 'pieces'::inventory_unit
    WHEN LOWER(rti.unit) = 'ml' THEN 'ml'::inventory_unit
    WHEN LOWER(rti.unit) = 'g' THEN 'g'::inventory_unit
    ELSE 'pieces'::inventory_unit
  END,
  rti.cost_per_unit,
  NOW(),
  NOW()
FROM recipe_template_ingredients rti
CROSS JOIN new_recipe nr
WHERE rti.recipe_template_id = 'a7554439-dea0-4310-8681-1b35a058361d'::uuid;

-- 5. Update product catalog to link to new recipe
WITH new_recipe AS (
  SELECT r.id as recipe_id, r.name
  FROM recipes r
  WHERE r.template_id = 'a7554439-dea0-4310-8681-1b35a058361d'::uuid
    AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
  LIMIT 1
)
UPDATE product_catalog 
SET recipe_id = nr.recipe_id,
    updated_at = NOW()
FROM new_recipe nr
WHERE product_catalog.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
  AND product_catalog.product_name = nr.name
  AND product_catalog.recipe_id IS NULL;

-- 6. Create missing inventory items if they don't exist
INSERT INTO inventory_stock (
  store_id,
  item,
  item_category,
  unit,
  stock_quantity,
  minimum_threshold,
  cost,
  is_active,
  recipe_compatible,
  created_at,
  updated_at
)
SELECT 
  'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid,
  ingredient_name,
  'packaging'::inventory_item_category,
  'pieces'::text,
  0,
  5,
  0,
  true,
  true,
  NOW(),
  NOW()
FROM (
  VALUES 
    ('Mini Take Out Box'),
    ('Popsicle')
) AS missing_items(ingredient_name)
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_stock ist
  WHERE ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
    AND LOWER(TRIM(ist.item)) = LOWER(TRIM(missing_items.ingredient_name))
);

-- 7. Map the newly created inventory items to Mini Croffle recipe ingredients
INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor,
  created_at,
  updated_at
)
SELECT DISTINCT
  ri.recipe_id,
  ri.ingredient_name,
  ist.id,
  1.0,
  NOW(),
  NOW()
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN inventory_stock ist ON ist.store_id = r.store_id 
  AND LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name))
WHERE r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
  AND ri.ingredient_name IN ('Mini Take Out Box', 'Popsicle')
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = ri.recipe_id 
      AND rim.ingredient_name = ri.ingredient_name
  );