-- FINAL STEP: Create Inventory Mappings and Product Catalog
-- Complete Premium Category Implementation

-- 1. Create inventory mappings for all Premium ingredients
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
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN inventory_stock ist ON (
  LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name))
  AND ist.store_id = r.store_id
  AND ist.is_active = true
)
WHERE r.name LIKE 'Premium -%'
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim 
    WHERE rim.recipe_id = r.id 
    AND rim.ingredient_name = ri.ingredient_name
    AND rim.inventory_stock_id = ist.id
  );

-- 2. Create ONE product catalog entry at a time to avoid SKU conflicts
-- Premium - Biscoff first
DO $$
DECLARE
    premium_recipe RECORD;
    premium_category_id UUID;
BEGIN
    FOR premium_recipe IN 
        SELECT r.id, r.name, r.store_id, rt.description, rt.suggested_price
        FROM recipes r 
        JOIN recipe_templates rt ON r.template_id = rt.id
        WHERE r.name = 'Premium - Biscoff' AND r.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM product_catalog pc 
            WHERE pc.recipe_id = r.id AND pc.store_id = r.store_id
        )
        ORDER BY r.store_id
    LOOP
        -- Get premium category for this store
        SELECT id INTO premium_category_id
        FROM categories 
        WHERE store_id = premium_recipe.store_id 
        AND LOWER(name) = 'premium' 
        LIMIT 1;
        
        -- Insert product catalog entry
        INSERT INTO product_catalog (
            store_id,
            product_name,
            description,
            price,
            recipe_id,
            category_id,
            is_available
        ) VALUES (
            premium_recipe.store_id,
            premium_recipe.name,
            premium_recipe.description,
            premium_recipe.suggested_price,
            premium_recipe.id,
            premium_category_id,
            true
        );
        
        -- Small delay to avoid timestamp collision
        PERFORM pg_sleep(0.001);
    END LOOP;
END $$;