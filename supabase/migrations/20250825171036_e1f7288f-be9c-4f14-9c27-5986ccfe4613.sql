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
    WHEN LOWER(rti.ingredient_name) LIKE '%sauce%' OR LOWER(rti.ingredient_name) LIKE '%syrup%' THEN 'sauces_syrups'::inventory_item_category
    WHEN LOWER(rti.ingredient_name) LIKE '%sprinkle%' OR LOWER(rti.ingredient_name) LIKE '%flake%' OR LOWER(rti.ingredient_name) LIKE '%crushed%' THEN 'toppings'::inventory_item_category
    WHEN LOWER(rti.ingredient_name) LIKE '%jam%' OR LOWER(rti.ingredient_name) LIKE '%cream%' THEN 'dairy_products'::inventory_item_category
    WHEN LOWER(rti.ingredient_name) LIKE '%milk%' OR LOWER(rti.ingredient_name) LIKE '%creamer%' THEN 'dairy_products'::inventory_item_category
    WHEN LOWER(rti.ingredient_name) LIKE '%cup%' OR LOWER(rti.ingredient_name) LIKE '%lid%' OR LOWER(rti.ingredient_name) LIKE '%container%' THEN 'packaging'::inventory_item_category
    WHEN LOWER(rti.ingredient_name) LIKE '%wrapper%' OR LOWER(rti.ingredient_name) LIKE '%bag%' OR LOWER(rti.ingredient_name) LIKE '%box%' THEN 'packaging'::inventory_item_category
    ELSE 'raw_materials'::inventory_item_category
  END as item_category,
  rti.unit::inventory_unit as unit,
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

-- Deploy product catalog preserving existing images and pricing
INSERT INTO product_catalog (
  store_id,
  product_name,
  description,
  price,
  recipe_id,
  category_id,
  is_available,
  image_url,
  created_at,
  updated_at
)
SELECT 
  s.id as store_id,
  rt.name as product_name,
  rt.description,
  COALESCE(
    (SELECT price FROM product_catalog pc_existing 
     WHERE pc_existing.store_id = s.id 
       AND LOWER(TRIM(pc_existing.product_name)) = LOWER(TRIM(rt.name))
     LIMIT 1),
    CASE 
      WHEN r.total_cost > 0 THEN ROUND(r.total_cost * 1.5, 2)
      ELSE 100.00
    END
  ) as price,
  r.id as recipe_id,
  (SELECT id FROM categories WHERE store_id = s.id AND name = rt.category_name LIMIT 1) as category_id,
  true as is_available,
  (SELECT image_url FROM product_catalog pc_existing 
   WHERE pc_existing.store_id = s.id 
     AND LOWER(TRIM(pc_existing.product_name)) = LOWER(TRIM(rt.name))
   LIMIT 1) as image_url,
  NOW() as created_at,
  NOW() as updated_at
FROM recipe_templates rt
JOIN recipes r ON r.template_id = rt.id
JOIN stores s ON r.store_id = s.id
WHERE rt.is_active = true 
  AND r.is_active = true
  AND s.is_active = true
ON CONFLICT (store_id, product_name) DO UPDATE SET
  description = EXCLUDED.description,
  recipe_id = EXCLUDED.recipe_id,
  category_id = EXCLUDED.category_id,
  is_available = EXCLUDED.is_available,
  updated_at = NOW();