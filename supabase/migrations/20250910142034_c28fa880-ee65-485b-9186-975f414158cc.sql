-- FINAL: Complete Premium Product Catalog Entries
-- Add remaining Premium products to catalog with timed delays

-- Premium - Nutella products (with delay to avoid SKU conflicts)
DO $$
DECLARE
    premium_recipe RECORD;
    premium_category_id UUID;
    counter INTEGER := 0;
BEGIN
    FOR premium_recipe IN 
        SELECT r.id, r.name, r.store_id, rt.description, rt.suggested_price
        FROM recipes r 
        JOIN recipe_templates rt ON r.template_id = rt.id
        WHERE r.name IN ('Premium - Nutella', 'Premium - Kitkat', 'Premium - Cookies & Cream') 
        AND r.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM product_catalog pc 
            WHERE pc.recipe_id = r.id AND pc.store_id = r.store_id
        )
        ORDER BY r.name, r.store_id
    LOOP
        counter := counter + 1;
        
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
        
        -- Progressive delay to ensure unique SKUs
        PERFORM pg_sleep(0.001 * counter);
    END LOOP;
END $$;