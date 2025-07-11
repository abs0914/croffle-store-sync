-- Fix any other foreign key constraints related to recipes and templates
-- Check and fix recipe_ingredients constraint if it exists
DO $$
BEGIN
    -- Drop and recreate recipe_ingredients foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'recipe_ingredients_recipe_id_fkey'
    ) THEN
        ALTER TABLE recipe_ingredients 
        DROP CONSTRAINT recipe_ingredients_recipe_id_fkey;
        
        ALTER TABLE recipe_ingredients 
        ADD CONSTRAINT recipe_ingredients_recipe_id_fkey 
        FOREIGN KEY (recipe_id) 
        REFERENCES recipes(id) 
        ON DELETE CASCADE;
    END IF;

    -- Drop and recreate product_catalog foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'product_catalog_recipe_id_fkey'
    ) THEN
        ALTER TABLE product_catalog 
        DROP CONSTRAINT product_catalog_recipe_id_fkey;
        
        ALTER TABLE product_catalog 
        ADD CONSTRAINT product_catalog_recipe_id_fkey 
        FOREIGN KEY (recipe_id) 
        REFERENCES recipes(id) 
        ON DELETE SET NULL;
    END IF;
END
$$;