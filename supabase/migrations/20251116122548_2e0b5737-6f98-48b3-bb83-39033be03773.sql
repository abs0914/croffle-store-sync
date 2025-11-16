
-- Create recipes for KitKat Biscuit linking to existing products table entries
DO $$
DECLARE
  v_stores_data record;
  v_recipe_id uuid;
BEGIN
  FOR v_stores_data IN 
    SELECT 
      p.id as product_id,
      p.store_id,
      s.name as store_name,
      ist.id as inventory_stock_id,
      pc.id as product_catalog_id
    FROM products p
    JOIN stores s ON p.store_id = s.id
    JOIN inventory_stock ist ON ist.store_id = p.store_id AND ist.item = 'Kitkat'
    JOIN product_catalog pc ON pc.store_id = p.store_id AND pc.product_name = 'KitKat Biscuit'
    WHERE p.name = 'KitKat Biscuit'
    AND NOT EXISTS (
      SELECT 1 FROM recipes r WHERE r.product_id = p.id
    )
  LOOP
    -- Create recipe
    INSERT INTO recipes (
      name,
      store_id,
      product_id,
      is_active,
      yield_quantity,
      serving_size,
      instructions
    ) VALUES (
      'KitKat Biscuit',
      v_stores_data.store_id,
      v_stores_data.product_id,
      true,
      1,
      1,
      'Serve 1 piece of KitKat biscuit'
    )
    RETURNING id INTO v_recipe_id;
    
    -- Create recipe ingredient (1 piece of Kitkat)
    INSERT INTO recipe_ingredients (
      recipe_id,
      inventory_stock_id,
      quantity,
      unit,
      cost_per_unit
    ) VALUES (
      v_recipe_id,
      v_stores_data.inventory_stock_id,
      1,
      'pieces',
      10.00
    );
    
    -- Link recipe to product_catalog
    UPDATE product_catalog
    SET recipe_id = v_recipe_id
    WHERE id = v_stores_data.product_catalog_id;
    
    RAISE NOTICE 'Created recipe for KitKat Biscuit in %', v_stores_data.store_name;
  END LOOP;
END $$;
