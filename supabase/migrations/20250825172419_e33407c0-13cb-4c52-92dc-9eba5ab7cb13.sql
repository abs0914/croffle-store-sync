-- Clear existing inventory stock records to start fresh
DELETE FROM inventory_stock WHERE id IS NOT NULL;

-- Deploy store inventory using exact imported costs from recipe templates
-- Set 50 units for each ingredient across all stores
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
  s.id as store_id,
  rti.ingredient_name as item,
  CASE 
    WHEN LOWER(rti.ingredient_name) LIKE '%sauce%' AND (LOWER(rti.ingredient_name) LIKE '%caramel%' OR LOWER(rti.ingredient_name) LIKE '%biscoff%') THEN 'premium_sauce'::inventory_item_category
    WHEN LOWER(rti.ingredient_name) LIKE '%sauce%' OR LOWER(rti.ingredient_name) LIKE '%syrup%' THEN 'classic_sauce'::inventory_item_category
    WHEN LOWER(rti.ingredient_name) LIKE '%sprinkle%' OR LOWER(rti.ingredient_name) LIKE '%flake%' OR LOWER(rti.ingredient_name) LIKE '%crushed%' THEN 'premium_topping'::inventory_item_category
    WHEN LOWER(rti.ingredient_name) LIKE '%jam%' OR LOWER(rti.ingredient_name) LIKE '%cream%' THEN 'classic_topping'::inventory_item_category
    WHEN LOWER(rti.ingredient_name) LIKE '%cup%' OR LOWER(rti.ingredient_name) LIKE '%lid%' OR LOWER(rti.ingredient_name) LIKE '%container%' THEN 'packaging'::inventory_item_category
    WHEN LOWER(rti.ingredient_name) LIKE '%wrapper%' OR LOWER(rti.ingredient_name) LIKE '%bag%' OR LOWER(rti.ingredient_name) LIKE '%box%' THEN 'packaging'::inventory_item_category
    WHEN LOWER(rti.ingredient_name) LIKE '%biscuit%' OR LOWER(rti.ingredient_name) LIKE '%graham%' THEN 'biscuit'::inventory_item_category
    ELSE 'base_ingredient'::inventory_item_category
  END as item_category,
  CASE 
    WHEN LOWER(rti.unit) = 'piece' THEN 'pieces'::inventory_unit
    WHEN LOWER(rti.unit) = 'pack' THEN 'packs'::inventory_unit
    WHEN LOWER(rti.unit) = 'box' THEN 'boxes'::inventory_unit
    WHEN LOWER(rti.unit) = 'liter' THEN 'liters'::inventory_unit
    ELSE rti.unit::inventory_unit
  END as unit,
  50 as stock_quantity,
  5 as minimum_threshold,
  rti.cost_per_unit as cost,
  true as is_active,
  true as recipe_compatible,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  SELECT DISTINCT 
    rti.ingredient_name,
    rti.unit,
    rti.cost_per_unit
  FROM recipe_template_ingredients rti
  JOIN recipe_templates rt ON rti.recipe_template_id = rt.id
  WHERE rt.is_active = true
) rti
CROSS JOIN (
  SELECT id FROM stores WHERE is_active = true
) s
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_stock ist
  WHERE ist.store_id = s.id 
    AND LOWER(TRIM(ist.item)) = LOWER(TRIM(rti.ingredient_name))
);

-- First, update existing products in product catalog to preserve images and pricing
UPDATE product_catalog 
SET 
  description = rt.description,
  recipe_id = r.id,
  category_id = (SELECT id FROM categories WHERE store_id = product_catalog.store_id AND name = rt.category_name LIMIT 1),
  is_available = true,
  updated_at = NOW()
FROM recipe_templates rt
JOIN recipes r ON r.template_id = rt.id
WHERE rt.is_active = true 
  AND r.is_active = true
  AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(rt.name))
  AND product_catalog.store_id = r.store_id;

-- Then, insert new products that don't exist yet (including add-ons) - COST ONLY, NO MARKUP
INSERT INTO product_catalog (
  store_id,
  product_name,
  description,
  price,
  recipe_id,
  category_id,
  is_available,
  created_at,
  updated_at
)
SELECT 
  s.id as store_id,
  rt.name as product_name,
  rt.description,
  CASE 
    WHEN r.total_cost > 0 THEN r.total_cost
    ELSE 50.00
  END as price,
  r.id as recipe_id,
  (SELECT id FROM categories WHERE store_id = s.id AND name = rt.category_name LIMIT 1) as category_id,
  true as is_available,
  NOW() as created_at,
  NOW() as updated_at
FROM recipe_templates rt
JOIN recipes r ON r.template_id = rt.id
JOIN stores s ON r.store_id = s.id
WHERE rt.is_active = true 
  AND r.is_active = true
  AND s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_catalog pc
    WHERE pc.store_id = s.id 
      AND LOWER(TRIM(pc.product_name)) = LOWER(TRIM(rt.name))
  );