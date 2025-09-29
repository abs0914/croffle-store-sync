-- Phase 2-3: Create comprehensive inventory system validation function
CREATE OR REPLACE FUNCTION validate_complete_inventory_system()
RETURNS TABLE(
  store_name text,
  store_id uuid,
  recipes_count integer,
  products_count integer,
  inventory_items integer,
  conversion_mappings integer,
  system_health text,
  can_process_transactions boolean,
  sample_test_results jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  store_record RECORD;
  recipe_record RECORD;
  test_results JSONB := '{}';
  ingredient_available BOOLEAN;
  total_recipes INTEGER;
  total_products INTEGER;
  total_inventory INTEGER;
  total_mappings INTEGER;
BEGIN
  -- Process each store
  FOR store_record IN 
    SELECT s.id, s.name FROM stores s WHERE s.is_active = true
  LOOP
    -- Count store resources
    SELECT COUNT(*) INTO total_recipes
    FROM recipes r 
    WHERE r.store_id = store_record.id AND r.is_active = true;
    
    SELECT COUNT(*) INTO total_products
    FROM product_catalog pc 
    WHERE pc.store_id = store_record.id AND pc.is_available = true;
    
    SELECT COUNT(*) INTO total_inventory
    FROM inventory_stock ist 
    WHERE ist.store_id = store_record.id AND ist.is_active = true;
    
    SELECT COUNT(*) INTO total_mappings
    FROM conversion_mappings cm
    JOIN inventory_stock ist ON cm.inventory_stock_id = ist.id
    WHERE ist.store_id = store_record.id AND cm.is_active = true;
    
    -- Test sample recipe ingredient availability
    SELECT EXISTS (
      SELECT 1 FROM recipe_ingredients ri
      JOIN recipes r ON ri.recipe_id = r.id
      JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
      WHERE r.store_id = store_record.id 
        AND r.is_active = true 
        AND ist.is_active = true
        AND ist.stock_quantity > ri.quantity
      LIMIT 1
    ) INTO ingredient_available;
    
    -- Build test results for this store
    test_results := jsonb_build_object(
      'inventory_linked', ingredient_available,
      'sample_recipe_test', CASE 
        WHEN ingredient_available THEN 'PASS - Ingredients properly linked and available'
        ELSE 'NEEDS_ATTENTION - No available ingredients found'
      END,
      'system_readiness', CASE
        WHEN total_recipes >= 70 AND total_products >= 60 AND total_inventory > 50 THEN 'READY'
        ELSE 'PARTIAL'
      END
    );
    
    -- Return results for this store
    RETURN QUERY SELECT
      store_record.name::text,
      store_record.id::uuid,
      total_recipes,
      total_products,
      total_inventory,
      total_mappings,
      CASE 
        WHEN total_recipes >= 70 AND total_products >= 60 AND total_inventory > 50 AND total_mappings > 50 THEN 'HEALTHY'
        WHEN total_recipes >= 60 AND total_products >= 50 THEN 'GOOD'
        ELSE 'NEEDS_IMPROVEMENT'
      END::text,
      (total_recipes >= 70 AND total_products >= 60 AND ingredient_available)::boolean,
      test_results;
  END LOOP;
END;
$$;

-- Execute comprehensive validation
SELECT * FROM validate_complete_inventory_system()
ORDER BY recipes_count DESC, products_count DESC;