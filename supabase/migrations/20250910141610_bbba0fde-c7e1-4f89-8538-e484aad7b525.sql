-- COMPLETE PREMIUM DEPLOYMENT AND MAPPING
-- Deploy Templates to Stores and Create Inventory Mappings

-- 1. Deploy Premium templates to all active stores as recipes
INSERT INTO recipes (
  name,
  store_id,
  template_id,
  is_active,
  serving_size,
  instructions,
  total_cost,
  cost_per_serving
)
SELECT 
  rt.name,
  s.id,
  rt.id,
  true,
  rt.serving_size,
  rt.instructions,
  -- Calculate total cost from template ingredients
  (SELECT COALESCE(SUM(rti.quantity * rti.cost_per_unit), 0)
   FROM recipe_template_ingredients rti 
   WHERE rti.recipe_template_id = rt.id),
  -- Calculate cost per serving
  (SELECT COALESCE(SUM(rti.quantity * rti.cost_per_unit), 0) / GREATEST(rt.serving_size, 1)
   FROM recipe_template_ingredients rti 
   WHERE rti.recipe_template_id = rt.id)
FROM recipe_templates rt
CROSS JOIN stores s
WHERE rt.name LIKE 'Premium -%' 
  AND rt.is_active = true
  AND s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipes r 
    WHERE r.name = rt.name 
    AND r.store_id = s.id 
    AND r.template_id = rt.id
  );

-- 2. Add recipe ingredients for all deployed Premium recipes
INSERT INTO recipe_ingredients (
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit
)
SELECT 
  r.id,
  rti.ingredient_name,
  rti.quantity,
  CASE 
    WHEN rti.unit = 'pieces' THEN 'pieces'::inventory_unit
    WHEN rti.unit = 'serving' THEN 'pieces'::inventory_unit
    WHEN rti.unit = 'portion' THEN 'g'::inventory_unit
    WHEN rti.unit = 'pair' THEN 'pieces'::inventory_unit
    ELSE 'pieces'::inventory_unit
  END,
  rti.cost_per_unit
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN recipe_template_ingredients rti ON rti.recipe_template_id = rt.id
WHERE rt.name LIKE 'Premium -%'
  AND rt.is_active = true
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = rti.ingredient_name
  );

-- 3. Create Premium categories if they don't exist
INSERT INTO categories (store_id, name, description, is_active)
SELECT DISTINCT
  s.id,
  'Premium',
  'Premium croffle products with premium ingredients',
  true
FROM stores s
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.store_id = s.id 
  AND LOWER(c.name) = 'premium'
);

-- 4. Create product catalog entries for Premium products
INSERT INTO product_catalog (
  store_id,
  product_name,
  description,
  price,
  recipe_id,
  category_id,
  is_available
)
SELECT 
  r.store_id,
  r.name,
  rt.description,
  rt.suggested_price,
  r.id,
  (SELECT id FROM categories c WHERE c.store_id = r.store_id AND LOWER(c.name) = 'premium' LIMIT 1),
  true
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
WHERE rt.name LIKE 'Premium -%'
  AND rt.is_active = true
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_catalog pc 
    WHERE pc.recipe_id = r.id 
    AND pc.store_id = r.store_id
  );

-- 5. Create inventory mappings for Premium recipe ingredients
INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor
)
SELECT DISTINCT
  r.id,
  ri.ingredient_name,
  ist.id,
  1.0
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN inventory_stock ist ON (
  LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name))
  AND ist.store_id = r.store_id
  AND ist.is_active = true
)
WHERE rt.name LIKE 'Premium -%'
  AND rt.is_active = true
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim 
    WHERE rim.recipe_id = r.id 
    AND rim.ingredient_name = ri.ingredient_name
    AND rim.inventory_stock_id = ist.id
  );