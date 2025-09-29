-- Fix Mini Croffle ingredient portions and remove duplicates (fixed syntax)

-- Step 1: Remove duplicate recipe ingredients for Mini Croffle recipes
WITH duplicate_ingredients AS (
  SELECT 
    ri.id,
    ROW_NUMBER() OVER (
      PARTITION BY ri.recipe_id, ri.inventory_stock_id 
      ORDER BY ri.created_at DESC
    ) as row_num
  FROM recipe_ingredients ri
  JOIN recipes r ON ri.recipe_id = r.id
  WHERE LOWER(r.name) LIKE '%mini croffle%'
    AND r.is_active = true
)
DELETE FROM recipe_ingredients 
WHERE id IN (
  SELECT id FROM duplicate_ingredients WHERE row_num > 1
);

-- Step 2: Update Mini Croffle choice ingredients to 0.5 portions
-- Choice ingredients are sauces and toppings (not base ingredients)
UPDATE recipe_ingredients
SET 
  quantity = 0.5,
  updated_at = NOW()
WHERE recipe_ingredients.id IN (
  SELECT ri.id
  FROM recipe_ingredients ri
  JOIN recipes r ON ri.recipe_id = r.id
  JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
  WHERE LOWER(r.name) LIKE '%mini croffle%'
    AND r.is_active = true
    AND (
      -- Sauce ingredients
      LOWER(ist.item) LIKE '%sauce%' OR
      LOWER(ist.item) LIKE '%syrup%' OR
      LOWER(ist.item) LIKE '%chocolate%' OR
      LOWER(ist.item) LIKE '%caramel%' OR
      LOWER(ist.item) LIKE '%nutella%' OR
      LOWER(ist.item) LIKE '%tiramisu%' OR
      -- Topping ingredients
      LOWER(ist.item) LIKE '%peanut%' OR
      LOWER(ist.item) LIKE '%marshmallow%' OR
      LOWER(ist.item) LIKE '%choco flake%' OR
      LOWER(ist.item) LIKE '%chocolate flake%' OR
      LOWER(ist.item) LIKE '%sprinkle%' OR
      LOWER(ist.item) LIKE '%oreo%' OR
      LOWER(ist.item) LIKE '%graham%' OR
      LOWER(ist.item) LIKE '%blueberry%' OR
      LOWER(ist.item) LIKE '%strawberry%' OR
      LOWER(ist.item) LIKE '%banana%'
    )
    -- Exclude base ingredients
    AND NOT (
      LOWER(ist.item) LIKE '%croissant%' OR
      LOWER(ist.item) LIKE '%whipped cream%' OR
      LOWER(ist.item) LIKE '%popsicle stick%' OR
      LOWER(ist.item) LIKE '%cup%' OR
      LOWER(ist.item) LIKE '%wrapper%'
    )
);

-- Step 3: Verify base ingredients have correct portions
-- Regular Croissant and Whipped Cream should be 0.5, Popsicle Stick should be 1.0
UPDATE recipe_ingredients
SET 
  quantity = 0.5,
  updated_at = NOW()
WHERE recipe_ingredients.id IN (
  SELECT ri.id
  FROM recipe_ingredients ri
  JOIN recipes r ON ri.recipe_id = r.id
  JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
  WHERE LOWER(r.name) LIKE '%mini croffle%'
    AND r.is_active = true
    AND (
      LOWER(ist.item) LIKE '%regular croissant%' OR
      LOWER(ist.item) LIKE '%whipped cream%'
    )
    AND ri.quantity != 0.5
);

UPDATE recipe_ingredients
SET 
  quantity = 1.0,
  updated_at = NOW()
WHERE recipe_ingredients.id IN (
  SELECT ri.id
  FROM recipe_ingredients ri
  JOIN recipes r ON ri.recipe_id = r.id
  JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
  WHERE LOWER(r.name) LIKE '%mini croffle%'
    AND r.is_active = true
    AND LOWER(ist.item) LIKE '%popsicle stick%'
    AND ri.quantity != 1.0
);

-- Step 4: Update recipe costs after portion adjustments
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
WHERE LOWER(name) LIKE '%mini croffle%'
  AND is_active = true;