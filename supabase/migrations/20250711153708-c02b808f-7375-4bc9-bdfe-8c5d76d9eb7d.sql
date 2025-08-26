-- Update migration functions to run with elevated privileges
CREATE OR REPLACE FUNCTION public.migrate_product_catalog_to_products()
 RETURNS TABLE(migrated_count integer, skipped_count integer, error_count integer, details text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  catalog_record RECORD;
  migrated_count integer := 0;
  skipped_count integer := 0;
  error_count integer := 0;
  details text[] := ARRAY[]::text[];
  generated_sku text;
  calculated_cost numeric;
BEGIN
  -- Loop through product_catalog entries
  FOR catalog_record IN 
    SELECT pc.*, r.total_cost as recipe_cost
    FROM product_catalog pc
    LEFT JOIN recipes r ON pc.recipe_id = r.id
  LOOP
    BEGIN
      -- Check if product already exists
      IF EXISTS (
        SELECT 1 FROM products 
        WHERE store_id = catalog_record.store_id 
        AND name = catalog_record.product_name
      ) THEN
        skipped_count := skipped_count + 1;
        details := details || (catalog_record.product_name || ' already exists in products table');
        CONTINUE;
      END IF;

      -- Generate SKU
      generated_sku := generate_recipe_sku(catalog_record.product_name, 'recipe');
      
      -- Calculate cost (use recipe cost if available, otherwise 60% of price)
      calculated_cost := COALESCE(catalog_record.recipe_cost, catalog_record.price * 0.6);

      -- Insert into products table
      INSERT INTO products (
        name,
        description,
        price,
        cost,
        sku,
        stock_quantity,
        category_id,
        store_id,
        is_active,
        recipe_id,
        product_type,
        image_url
      ) VALUES (
        catalog_record.product_name,
        catalog_record.description,
        catalog_record.price,
        calculated_cost,
        generated_sku,
        100, -- Default stock for recipe products
        catalog_record.category_id,
        catalog_record.store_id,
        catalog_record.is_available,
        catalog_record.recipe_id,
        'recipe',
        catalog_record.image_url
      );

      migrated_count := migrated_count + 1;
      details := details || ('Successfully migrated: ' || catalog_record.product_name);

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      details := details || ('Error migrating ' || catalog_record.product_name || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN QUERY SELECT migrated_count, skipped_count, error_count, details;
END;
$function$;

CREATE OR REPLACE FUNCTION public.deploy_products_to_all_stores()
 RETURNS TABLE(deployed_count integer, error_count integer, details text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  store_record RECORD;
  product_record RECORD;
  deployed_count integer := 0;
  error_count integer := 0;
  details text[] := ARRAY[]::text[];
  generated_sku text;
BEGIN
  -- Get all stores
  FOR store_record IN SELECT id, name FROM stores WHERE is_active = true LOOP
    -- Get all unique products (from any store) that don't exist in this store
    FOR product_record IN 
      SELECT DISTINCT ON (name, recipe_id) 
        name, description, price, cost, category_id, recipe_id, product_type, image_url, is_active
      FROM products 
      WHERE NOT EXISTS (
        SELECT 1 FROM products p2 
        WHERE p2.store_id = store_record.id 
        AND p2.name = products.name
      )
    LOOP
      BEGIN
        -- Generate unique SKU for this store
        generated_sku := generate_recipe_sku(product_record.name, 'recipe');
        
        -- Insert product for this store
        INSERT INTO products (
          name,
          description,
          price,
          cost,
          sku,
          stock_quantity,
          category_id,
          store_id,
          is_active,
          recipe_id,
          product_type,
          image_url
        ) VALUES (
          product_record.name,
          product_record.description,
          product_record.price,
          product_record.cost,
          generated_sku,
          100,
          product_record.category_id,
          store_record.id,
          product_record.is_active,
          product_record.recipe_id,
          product_record.product_type,
          product_record.image_url
        );

        deployed_count := deployed_count + 1;
        details := details || ('Deployed ' || product_record.name || ' to ' || store_record.name);

      EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        details := details || ('Error deploying ' || product_record.name || ' to ' || store_record.name || ': ' || SQLERRM);
      END;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT deployed_count, error_count, details;
END;
$function$;