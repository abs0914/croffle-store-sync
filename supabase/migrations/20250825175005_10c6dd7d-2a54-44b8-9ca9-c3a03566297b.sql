-- Clean up and sync product catalog with recipe templates
-- This will create a clean product catalog based on imported recipe templates

-- Step 1: Clean up existing product catalog (remove duplicates and outdated entries)
DELETE FROM product_catalog;

-- Step 2: Create recipes for each template (one per store)
-- First, get all active stores
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
    s.id as store_id,
    rt.id as template_id,
    true,
    COALESCE(rt.serving_size, 1),
    COALESCE(rt.instructions, 'Follow standard preparation instructions'),
    0, -- Will be calculated after ingredients are added
    0, -- Will be calculated after ingredients are added
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
      AND r.is_active = true
  );

-- Step 3: Copy template ingredients to recipe ingredients for new recipes
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
    rti.unit,
    COALESCE(rti.cost_per_unit, 0),
    NOW(),
    NOW()
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN recipe_template_ingredients rti ON rt.id = rti.recipe_template_id
WHERE r.is_active = true
  AND rt.is_active = true
  AND r.created_at >= NOW() - INTERVAL '1 minute' -- Only for newly created recipes
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
      AND ri.ingredient_name = rti.ingredient_name
  );

-- Step 4: Update recipe costs based on ingredients
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
WHERE template_id IS NOT NULL
  AND is_active = true;

-- Step 5: Create clean product catalog entries for all recipes
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
SELECT DISTINCT
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
JOIN stores s ON r.store_id = s.id
LEFT JOIN categories c ON (c.store_id = s.id AND LOWER(c.name) = LOWER(rt.category_name))
WHERE r.is_active = true 
  AND rt.is_active = true
  AND s.is_active = true;

-- Step 6: Create missing categories for stores that don't have them
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
    'Auto-created category from recipe templates' as description,
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

-- Step 7: Update product catalog entries to link to correct categories
UPDATE product_catalog 
SET category_id = c.id,
    updated_at = NOW()
FROM categories c
JOIN recipes r ON r.store_id = c.store_id
JOIN recipe_templates rt ON r.template_id = rt.id
WHERE product_catalog.recipe_id = r.id
  AND LOWER(c.name) = LOWER(rt.category_name)
  AND product_catalog.category_id IS NULL;

-- Step 8: Create function to check recipe ingredient availability
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
        -- Find matching inventory item (simple name matching for now)
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
        
        -- If no matching inventory item found or stock is insufficient, recipe is not available
        IF available_stock IS NULL OR available_stock < ingredient_record.required_quantity THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    -- All ingredients are available
    RETURN TRUE;
END;
$$;

-- Step 9: Create function to update product availability based on ingredient stock
CREATE OR REPLACE FUNCTION update_product_availability_from_inventory()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
    product_record RECORD;
    is_recipe_available BOOLEAN;
    updated_count INTEGER := 0;
BEGIN
    -- Check each product in the catalog that has a recipe
    FOR product_record IN 
        SELECT 
            pc.id as product_id,
            pc.recipe_id,
            pc.store_id,
            pc.is_available as current_availability
        FROM product_catalog pc
        WHERE pc.recipe_id IS NOT NULL
    LOOP
        -- Check if the recipe can be made with current inventory
        SELECT check_recipe_ingredient_availability(product_record.recipe_id, product_record.store_id) 
        INTO is_recipe_available;
        
        -- Update availability if it has changed
        IF is_recipe_available != product_record.current_availability THEN
            UPDATE product_catalog 
            SET is_available = is_recipe_available,
                updated_at = NOW()
            WHERE id = product_record.product_id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$;