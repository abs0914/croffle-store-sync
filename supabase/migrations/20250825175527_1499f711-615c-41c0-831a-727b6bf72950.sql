-- Clean up and sync product catalog (Use only valid enum values)

-- Step 1: Clean up product catalog completely
DELETE FROM product_catalog;

-- Step 2: Update existing recipes to link with templates where names match
UPDATE recipes 
SET template_id = rt.id,
    updated_at = NOW()
FROM recipe_templates rt
WHERE recipes.name = rt.name 
  AND rt.is_active = true
  AND recipes.template_id IS NULL;

-- Step 3: Delete existing recipe ingredients for recipes that now have templates
DELETE FROM recipe_ingredients 
WHERE recipe_id IN (
  SELECT id FROM recipes WHERE template_id IS NOT NULL
);

-- Step 4: Create new recipes for templates that don't have existing recipes
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
SELECT DISTINCT
    rt.name,
    s.id as store_id,
    rt.id as template_id,
    true,
    COALESCE(rt.serving_size, 1),
    COALESCE(rt.instructions, 'Follow standard preparation instructions'),
    0,
    0,
    NOW(),
    NOW()
FROM recipe_templates rt
CROSS JOIN stores s
WHERE rt.is_active = true 
  AND s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipes r 
    WHERE r.template_id = rt.id 
      AND r.store_id = s.id
  );

-- Step 5: Add ingredients from templates to all template-linked recipes (only valid enums)
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
    r.id as recipe_id,
    rti.ingredient_name,
    rti.quantity,
    CASE 
        WHEN rti.unit = 'piece' THEN 'pieces'::inventory_unit
        WHEN rti.unit = 'pieces' THEN 'pieces'::inventory_unit
        WHEN rti.unit = 'g' THEN 'g'::inventory_unit
        WHEN rti.unit = 'ml' THEN 'ml'::inventory_unit
        WHEN rti.unit = 'kg' THEN 'kg'::inventory_unit
        WHEN rti.unit = 'l' THEN 'liters'::inventory_unit
        WHEN rti.unit = 'liters' THEN 'liters'::inventory_unit
        WHEN rti.unit = 'boxes' THEN 'boxes'::inventory_unit
        WHEN rti.unit = 'packs' THEN 'packs'::inventory_unit
        -- Map any other units to appropriate fallbacks
        ELSE 'pieces'::inventory_unit -- Default fallback to pieces
    END as unit,
    COALESCE(rti.cost_per_unit, 0),
    NOW(),
    NOW()
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN recipe_template_ingredients rti ON rt.id = rti.recipe_template_id
WHERE r.template_id IS NOT NULL;

-- Step 6: Update recipe costs
UPDATE recipes SET
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
WHERE template_id IS NOT NULL;

-- Step 7: Create missing categories
INSERT INTO categories (
    store_id,
    name,
    description,
    is_active,
    created_at,
    updated_at
)
SELECT DISTINCT
    s.id as store_id,
    rt.category_name as name,
    'Auto-created from recipe templates' as description,
    true,
    NOW(),
    NOW()
FROM stores s
CROSS JOIN (
    SELECT DISTINCT category_name 
    FROM recipe_templates 
    WHERE is_active = true AND category_name IS NOT NULL
) rt
WHERE s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM categories c 
    WHERE c.store_id = s.id 
      AND LOWER(c.name) = LOWER(rt.category_name)
  );

-- Step 8: Create clean product catalog
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
    r.store_id,
    rt.name as product_name,
    COALESCE(rt.description, 'Made fresh to order') as description,
    CASE 
        WHEN rt.category_name = 'Premium' THEN 150.00
        WHEN rt.category_name = 'Espresso' THEN 120.00
        WHEN rt.category_name = 'Fruity' THEN 135.00
        WHEN rt.category_name = 'Add-on' THEN 25.00
        WHEN rt.category_name = 'Beverages' THEN 60.00
        WHEN rt.category_name = 'Milk Tea' THEN 100.00
        ELSE 100.00
    END as price,
    r.id as recipe_id,
    c.id as category_id,
    true as is_available,
    NOW(),
    NOW()
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
LEFT JOIN categories c ON (c.store_id = r.store_id AND LOWER(c.name) = LOWER(rt.category_name))
WHERE r.template_id IS NOT NULL;

-- Step 9: Create functions for automatic availability checking
CREATE OR REPLACE FUNCTION check_recipe_ingredient_availability(recipe_id_param UUID, store_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
    ingredient_record RECORD;
    available_stock NUMERIC;
BEGIN
    -- Check each ingredient in the recipe
    FOR ingredient_record IN 
        SELECT 
            ri.ingredient_name,
            ri.quantity as required_quantity
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = recipe_id_param
    LOOP
        -- Find matching inventory item (simple name matching)
        SELECT ist.current_stock INTO available_stock
        FROM inventory_stock ist
        WHERE ist.store_id = store_id_param
          AND ist.is_active = true
          AND (
              LOWER(TRIM(ist.item)) = LOWER(TRIM(ingredient_record.ingredient_name))
              OR LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(ingredient_record.ingredient_name)) || '%'
              OR LOWER(TRIM(ingredient_record.ingredient_name)) LIKE '%' || LOWER(TRIM(ist.item)) || '%'
          )
        ORDER BY 
            CASE 
                WHEN LOWER(TRIM(ist.item)) = LOWER(TRIM(ingredient_record.ingredient_name)) THEN 1
                ELSE 2
            END
        LIMIT 1;
        
        -- If no matching inventory item found or stock is zero/insufficient, recipe is not available
        IF available_stock IS NULL OR available_stock <= 0 THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    -- All ingredients are available with stock > 0
    RETURN TRUE;
END;
$$;