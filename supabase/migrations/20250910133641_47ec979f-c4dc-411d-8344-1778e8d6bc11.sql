-- Comprehensive Recipe Data Correction Migration
-- This migration corrects all ingredient quantities, units, and mappings based on specifications

-- Phase 1: Update Recipe Template Ingredients with Correct Quantities and Units

-- Coffee Beans corrections
UPDATE recipe_template_ingredients
SET quantity = 12, unit = 'g'
WHERE ingredient_name = 'Coffee Beans' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name IN ('Americano Hot', 'Americano Cold')
  );

UPDATE recipe_template_ingredients
SET quantity = 10, unit = 'g'
WHERE ingredient_name = 'Coffee Beans' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name IN ('Cafe Mocha Hot', 'Cafe Mocha Iced', 'Cappuccino Hot', 'Cappuccino Iced', 
                   'Cafe Latte Hot', 'Cafe Latte Iced', 'Caramel Latte Hot', 'Caramel Latte Iced')
  );

-- Vanilla Syrup corrections
UPDATE recipe_template_ingredients
SET quantity = 5, unit = 'ml'
WHERE ingredient_name = 'Vanilla Syrup' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name IN ('Caramel Latte Hot', 'Caramel Latte Iced', 'Strawberry Latte')
  );

UPDATE recipe_template_ingredients
SET quantity = 10, unit = 'ml'
WHERE ingredient_name = 'Vanilla Syrup' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name = 'Vanilla Caramel'
  );

-- Frappe Powder corrections
UPDATE recipe_template_ingredients
SET quantity = 20, unit = 'g'
WHERE ingredient_name = 'Frappe Powder' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name = 'Matcha Blended'
  );

UPDATE recipe_template_ingredients
SET quantity = 30, unit = 'g'
WHERE ingredient_name = 'Frappe Powder' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name IN ('Strawberry Kiss', 'Oreo Strawberry')
  );

-- Other powder corrections
UPDATE recipe_template_ingredients
SET quantity = 10, unit = 'g'
WHERE ingredient_name = 'Iced Tea Powder' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name = 'Iced Tea'
  );

UPDATE recipe_template_ingredients
SET quantity = 10, unit = 'g'
WHERE ingredient_name = 'Lemonade Powder' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name = 'Lemonade'
  );

-- Choco Flakes corrections (using 'portions' as unit)
UPDATE recipe_template_ingredients
SET quantity = 2, unit = 'portions'
WHERE ingredient_name = 'Choco Flakes' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name = 'Strawberry Kiss'
  );

UPDATE recipe_template_ingredients
SET quantity = 1, unit = 'portions'
WHERE ingredient_name = 'Choco Flakes' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name IN ('Tiramisu', 'Croffle Overload', 'Mini Croffle')
  );

-- Oreo ingredients corrections
UPDATE recipe_template_ingredients
SET quantity = 1, unit = 'pieces'
WHERE ingredient_name = 'Oreo Cookie' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name = 'Oreo Strawberry'
  );

UPDATE recipe_template_ingredients
SET quantity = 3, unit = 'portions'
WHERE ingredient_name = 'Crushed Oreo' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name = 'Oreo Strawberry'
  );

-- Milk corrections (150ml for all specified drinks)
UPDATE recipe_template_ingredients
SET quantity = 150, unit = 'ml'
WHERE ingredient_name = 'Milk' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name IN ('Cafe Mocha Hot', 'Cafe Mocha Iced', 'Cappuccino Hot', 'Cappuccino Iced',
                   'Cafe Latte Hot', 'Cafe Latte Iced', 'Caramel Latte Hot', 'Caramel Latte Iced',
                   'Vanilla Caramel', 'Matcha', 'Strawberry Latte', 'Strawberry Kiss', 'Oreo Strawberry')
  );

-- Monalisa corrections
UPDATE recipe_template_ingredients
SET quantity = 5, unit = 'ml'
WHERE ingredient_name = 'Monalisa' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name = 'Vanilla Caramel'
  );

-- Matcha Powder corrections
UPDATE recipe_template_ingredients
SET quantity = 30, unit = 'g'
WHERE ingredient_name = 'Matcha Powder' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name = 'Matcha Blended'
  );

-- Chocolate Syrup corrections
UPDATE recipe_template_ingredients
SET quantity = 30, unit = 'ml'
WHERE ingredient_name = 'Chocolate Syrup' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name IN ('Cafe Mocha Hot', 'Cafe Mocha Iced')
  );

-- Strawberry Syrup corrections
UPDATE recipe_template_ingredients
SET quantity = 20, unit = 'ml'
WHERE ingredient_name = 'Strawberry Syrup' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name = 'Strawberry Latte'
  );

UPDATE recipe_template_ingredients
SET quantity = 30, unit = 'ml'
WHERE ingredient_name = 'Strawberry Syrup' 
  AND recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name IN ('Strawberry Kiss', 'Oreo Strawberry')
  );

-- Phase 2: Re-deploy Templates to All Stores (Update Recipes)
-- First, update existing recipe ingredients with correct quantities from templates

UPDATE recipe_ingredients ri
SET quantity = rti.quantity,
    unit = rti.unit::inventory_unit,
    updated_at = NOW()
FROM recipe_template_ingredients rti,
     recipes r
WHERE ri.recipe_id = r.id
  AND r.template_id = rti.recipe_template_id
  AND ri.ingredient_name = rti.ingredient_name
  AND r.is_active = true;

-- Phase 3: Create Missing Ingredients in Recipes from Templates
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
  r.id,
  rti.ingredient_name,
  rti.quantity,
  CASE 
    WHEN rti.unit = 'pieces' THEN 'pieces'::inventory_unit
    WHEN rti.unit = 'portions' THEN 'pieces'::inventory_unit
    WHEN rti.unit = 'ml' THEN 'ml'::inventory_unit
    WHEN rti.unit = 'g' THEN 'g'::inventory_unit
    ELSE 'pieces'::inventory_unit
  END,
  rti.cost_per_unit,
  NOW(),
  NOW()
FROM recipe_template_ingredients rti
JOIN recipes r ON r.template_id = rti.recipe_template_id
WHERE r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = r.id
      AND ri.ingredient_name = rti.ingredient_name
  );

-- Phase 4: Update Recipe Costs
UPDATE recipes 
SET total_cost = (
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
WHERE is_active = true;

-- Phase 5: Create/Update Inventory Mappings
-- Map Coffee Beans
INSERT INTO recipe_ingredient_mappings (recipe_id, ingredient_name, inventory_stock_id, conversion_factor, created_at, updated_at)
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
  AND ist.item = ri.ingredient_name
  AND ist.is_active = true
WHERE ri.ingredient_name = 'Coffee Beans'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = ri.recipe_id
      AND rim.ingredient_name = ri.ingredient_name
  );

-- Map other common ingredients with fuzzy matching
INSERT INTO recipe_ingredient_mappings (recipe_id, ingredient_name, inventory_stock_id, conversion_factor, created_at, updated_at)
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
  AND ist.is_active = true
WHERE ri.ingredient_name IN ('Milk', 'Vanilla Syrup', 'Chocolate Syrup', 'Strawberry Syrup', 'Matcha Powder', 'Frappe Powder')
  AND (
    LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name))
    OR LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(ri.ingredient_name)) || '%'
    OR LOWER(TRIM(ri.ingredient_name)) LIKE '%' || LOWER(TRIM(ist.item)) || '%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = ri.recipe_id
      AND rim.ingredient_name = ri.ingredient_name
  );

-- Phase 6: Validation Report
-- Create a temporary view for validation
CREATE OR REPLACE VIEW recipe_correction_validation AS
SELECT 
  rt.name as template_name,
  r.name as recipe_name,
  s.name as store_name,
  ri.ingredient_name,
  ri.quantity,
  ri.unit,
  CASE WHEN rim.inventory_stock_id IS NOT NULL THEN 'Mapped' ELSE 'Unmapped' END as mapping_status,
  ist.item as inventory_item,
  ist.stock_quantity as current_stock
FROM recipe_templates rt
JOIN recipes r ON r.template_id = rt.id
JOIN stores s ON r.store_id = s.id
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
LEFT JOIN recipe_ingredient_mappings rim ON rim.recipe_id = ri.recipe_id 
  AND rim.ingredient_name = ri.ingredient_name
LEFT JOIN inventory_stock ist ON rim.inventory_stock_id = ist.id
WHERE rt.is_active = true 
  AND r.is_active = true 
  AND s.is_active = true
ORDER BY rt.name, s.name, ri.ingredient_name;