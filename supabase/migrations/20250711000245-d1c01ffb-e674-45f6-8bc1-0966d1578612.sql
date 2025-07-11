-- Migration: Create product catalog entries for existing deployed recipes

-- Function to migrate existing recipes to product catalog
CREATE OR REPLACE FUNCTION migrate_recipes_to_product_catalog()
RETURNS TABLE(migrated_count integer, error_count integer, details text[])
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  migrated_count integer := 0;
  error_count integer := 0;
  details text[] := ARRAY[]::text[];
  catalog_product_id uuid;
  ingredient_count integer := 0;
BEGIN
  -- Get all recipes that don't have corresponding product catalog entries
  FOR rec IN 
    SELECT DISTINCT r.id as recipe_id, r.name, r.description, r.suggested_price, 
           r.total_cost, r.store_id
    FROM recipes r
    LEFT JOIN product_catalog pc ON r.id = pc.recipe_id AND r.store_id = pc.store_id
    WHERE pc.id IS NULL 
      AND r.is_active = true
      AND r.approval_status = 'approved'
  LOOP
    BEGIN
      -- Create product catalog entry
      INSERT INTO product_catalog (
        store_id, 
        product_name, 
        description, 
        price, 
        is_available, 
        recipe_id,
        display_order
      ) VALUES (
        rec.store_id,
        rec.name,
        rec.description,
        COALESCE(rec.suggested_price, rec.total_cost * 1.5),
        true,
        rec.recipe_id,
        0
      ) RETURNING id INTO catalog_product_id;

      -- Create product ingredients from recipe ingredients
      INSERT INTO product_ingredients (
        product_catalog_id,
        inventory_stock_id,
        commissary_item_id,
        required_quantity,
        unit
      )
      SELECT 
        catalog_product_id,
        ri.inventory_stock_id,
        ri.commissary_item_id,
        ri.quantity,
        ri.unit
      FROM recipe_ingredients ri
      WHERE ri.recipe_id = rec.recipe_id
        AND (ri.inventory_stock_id IS NOT NULL OR ri.commissary_item_id IS NOT NULL);

      GET DIAGNOSTICS ingredient_count = ROW_COUNT;
      
      migrated_count := migrated_count + 1;
      details := details || (rec.name || ' migrated with ' || ingredient_count::text || ' ingredients');
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      details := details || ('Error migrating ' || rec.name || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN QUERY SELECT migrated_count, error_count, details;
END;
$$;

-- Run the migration
SELECT * FROM migrate_recipes_to_product_catalog();