-- COMPREHENSIVE PREMIUM PRODUCT INVENTORY MAPPING FIXES
-- HIGH PRIORITY: Create Premium recipes, add missing inventory, fix zero costs
-- MEDIUM PRIORITY: Standardize costs, verify unit consistency

-- ========================================
-- HIGH PRIORITY FIXES
-- ========================================

-- 1. Add missing "Chocolate Crumbs" inventory item to all stores
INSERT INTO inventory_stock (
  store_id,
  item,
  item_category,
  unit,
  cost,
  stock_quantity,
  minimum_threshold,
  is_active,
  recipe_compatible,
  created_at,
  updated_at
)
SELECT 
  s.id,
  'Chocolate Crumbs',
  'premium_topping'::inventory_item_category,
  'portion',
  2.50,
  0, -- Starting with 0 stock
  5, -- Minimum threshold
  true,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM inventory_stock ist 
    WHERE ist.store_id = s.id 
    AND LOWER(TRIM(ist.item)) = 'chocolate crumbs'
  );

-- 2. Create Premium recipe templates with correct ingredients and costs
-- Premium - Choco Overload Template
INSERT INTO recipe_templates (
  name,
  category_name,
  description,
  instructions,
  serving_size,
  suggested_price,
  is_active,
  created_by,
  created_at,
  updated_at
) VALUES (
  'Premium - Choco Overload',
  'Premium',
  'Premium croffle with chocolate sauce and choco flakes',
  'Prepare regular croissant, add whipped cream, drizzle chocolate sauce, sprinkle choco flakes, serve with rectangle and chopsticks, wrap in wax paper',
  1,
  150.00, -- Higher price for premium
  true,
  '00000000-0000-0000-0000-000000000000', -- System user
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  suggested_price = EXCLUDED.suggested_price,
  updated_at = NOW();

-- Premium - Matcha Template  
INSERT INTO recipe_templates (
  name,
  category_name,
  description,
  instructions,
  serving_size,
  suggested_price,
  is_active,
  created_by,
  created_at,
  updated_at
) VALUES (
  'Premium - Matcha',
  'Premium',
  'Premium croffle with matcha crumble topping',
  'Prepare regular croissant, add whipped cream, sprinkle matcha crumble, serve with rectangle and chopsticks, wrap in wax paper',
  1,
  145.00,
  true,
  '00000000-0000-0000-0000-000000000000',
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  suggested_price = EXCLUDED.suggested_price,
  updated_at = NOW();

-- Premium - Dark Chocolate Template
INSERT INTO recipe_templates (
  name,
  category_name,  
  description,
  instructions,
  serving_size,
  suggested_price,
  is_active,
  created_by,
  created_at,
  updated_at
) VALUES (
  'Premium - Dark Chocolate',
  'Premium', 
  'Premium croffle with dark chocolate sauce and chocolate crumbs',
  'Prepare regular croissant, add whipped cream, drizzle dark chocolate sauce, sprinkle chocolate crumbs, serve with rectangle and chopsticks, wrap in wax paper',
  1,
  155.00,
  true,
  '00000000-0000-0000-0000-000000000000',
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  suggested_price = EXCLUDED.suggested_price,
  updated_at = NOW();

-- 3. Add template ingredients for Premium - Choco Overload
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  notes,
  created_at,
  updated_at
)
SELECT 
  rt.id,
  ingredient_data.ingredient_name,
  ingredient_data.quantity,
  ingredient_data.unit,
  ingredient_data.cost_per_unit,
  ingredient_data.notes,
  NOW(),
  NOW()
FROM recipe_templates rt
CROSS JOIN (
  VALUES 
    ('Regular Croissant', 1, 'pieces', 30.00, 'Base croissant'),
    ('Whipped Cream', 1, 'serving', 8.00, 'Premium topping'),
    ('Chocolate Sauce', 1, 'portion', 2.50, 'Classic sauce'),
    ('Choco Flakes', 1, 'portion', 2.50, 'Premium topping'),
    ('Rectangle', 1, 'pieces', 6.00, 'Serving accessory'),
    ('Chopstick', 1, 'pair', 0.60, 'Utensil'),
    ('Wax Paper', 1, 'pieces', 0.70, 'Packaging')
) AS ingredient_data(ingredient_name, quantity, unit, cost_per_unit, notes)
WHERE rt.name = 'Premium - Choco Overload'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_template_ingredients rti
    WHERE rti.recipe_template_id = rt.id
    AND rti.ingredient_name = ingredient_data.ingredient_name
  );

-- 4. Add template ingredients for Premium - Matcha
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  notes,
  created_at,
  updated_at
)
SELECT 
  rt.id,
  ingredient_data.ingredient_name,
  ingredient_data.quantity,
  ingredient_data.unit,
  ingredient_data.cost_per_unit,
  ingredient_data.notes,
  NOW(),
  NOW()
FROM recipe_templates rt
CROSS JOIN (
  VALUES 
    ('Regular Croissant', 1, 'pieces', 30.00, 'Base croissant'),
    ('Whipped Cream', 1, 'serving', 8.00, 'Premium topping'),
    ('Matcha Crumble', 1, 'portion', 2.50, 'Premium topping'),
    ('Rectangle', 1, 'pieces', 6.00, 'Serving accessory'),
    ('Chopstick', 1, 'pair', 0.60, 'Utensil'),
    ('Wax Paper', 1, 'pieces', 0.70, 'Packaging')
) AS ingredient_data(ingredient_name, quantity, unit, cost_per_unit, notes)
WHERE rt.name = 'Premium - Matcha'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_template_ingredients rti
    WHERE rti.recipe_template_id = rt.id
    AND rti.ingredient_name = ingredient_data.ingredient_name
  );

-- 5. Add template ingredients for Premium - Dark Chocolate
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  notes,
  created_at,
  updated_at
)
SELECT 
  rt.id,
  ingredient_data.ingredient_name,
  ingredient_data.quantity,
  ingredient_data.unit,
  ingredient_data.cost_per_unit,
  ingredient_data.notes,
  NOW(),
  NOW()
FROM recipe_templates rt
CROSS JOIN (
  VALUES 
    ('Regular Croissant', 1, 'pieces', 30.00, 'Base croissant'),
    ('Whipped Cream', 1, 'serving', 8.00, 'Premium topping'),
    ('Dark Chocolate Sauce', 1, 'portion', 2.50, 'Premium sauce'),
    ('Chocolate Crumbs', 1, 'portion', 2.50, 'Premium topping'),
    ('Rectangle', 1, 'pieces', 6.00, 'Serving accessory'),
    ('Chopstick', 1, 'pair', 0.60, 'Utensil'),
    ('Wax Paper', 1, 'pieces', 0.70, 'Packaging')
) AS ingredient_data(ingredient_name, quantity, unit, cost_per_unit, notes)
WHERE rt.name = 'Premium - Dark Chocolate'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_template_ingredients rti
    WHERE rti.recipe_template_id = rt.id
    AND rti.ingredient_name = ingredient_data.ingredient_name
  );

-- ========================================
-- MEDIUM PRIORITY FIXES
-- ========================================

-- 6. Standardize costs across similar ingredients
-- Update Choco Flakes cost to ₱2.50 (currently ₱2.00)
UPDATE inventory_stock 
SET cost = 2.50, updated_at = NOW()
WHERE LOWER(TRIM(item)) = 'choco flakes' 
  AND cost != 2.50;

-- Update Matcha Crumble cost to ₱2.50 (currently ₱1.00 in some stores)
UPDATE inventory_stock 
SET cost = 2.50, updated_at = NOW()
WHERE LOWER(TRIM(item)) = 'matcha crumble' 
  AND cost != 2.50;

-- Update Dark Chocolate Sauce cost to ₱2.50 (currently ₱1.75 in some stores)
UPDATE inventory_stock 
SET cost = 2.50, updated_at = NOW()
WHERE LOWER(TRIM(item)) = 'dark chocolate sauce' 
  AND cost != 2.50;

-- 7. Fix all zero-cost ingredients in existing recipes
UPDATE recipe_ingredients 
SET cost_per_unit = (
  CASE 
    WHEN LOWER(TRIM(ingredient_name)) = 'regular croissant' THEN 30.00
    WHEN LOWER(TRIM(ingredient_name)) = 'whipped cream' THEN 8.00
    WHEN LOWER(TRIM(ingredient_name)) LIKE '%chocolate sauce%' THEN 2.50
    WHEN LOWER(TRIM(ingredient_name)) = 'choco flakes' THEN 2.50
    WHEN LOWER(TRIM(ingredient_name)) = 'chocolate crumbs' THEN 2.50
    WHEN LOWER(TRIM(ingredient_name)) = 'matcha crumble' THEN 2.50
    WHEN LOWER(TRIM(ingredient_name)) = 'dark chocolate sauce' THEN 2.50
    WHEN LOWER(TRIM(ingredient_name)) = 'rectangle' THEN 6.00
    WHEN LOWER(TRIM(ingredient_name)) = 'chopstick' THEN 0.60
    WHEN LOWER(TRIM(ingredient_name)) = 'wax paper' THEN 0.70
    WHEN LOWER(TRIM(ingredient_name)) LIKE '%biscuit%' THEN 10.00
    WHEN LOWER(TRIM(ingredient_name)) LIKE '%sauce%' THEN 2.50
    WHEN LOWER(TRIM(ingredient_name)) LIKE '%syrup%' THEN 1.25
    ELSE 1.00 -- Default fallback for other ingredients
  END
),
updated_at = NOW()
WHERE cost_per_unit = 0 OR cost_per_unit IS NULL;

-- 8. Verify and standardize unit consistency
-- Update any "piece" to "pieces" for consistency
UPDATE inventory_stock 
SET unit = 'pieces', updated_at = NOW()
WHERE unit = 'piece';

UPDATE recipe_ingredients 
SET unit = 'pieces'::inventory_unit, updated_at = NOW()
WHERE unit = 'piece'::inventory_unit;

-- 9. Update recipe total costs based on corrected ingredient costs
UPDATE recipes 
SET 
  total_cost = (
    SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ),
  cost_per_serving = (
    SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0) / GREATEST(serving_size, 1)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM recipe_ingredients ri
  WHERE ri.recipe_id = recipes.id
);

-- 10. Deploy Premium recipes to all active stores using the function
SELECT deploy_and_fix_recipe_templates_to_all_stores();