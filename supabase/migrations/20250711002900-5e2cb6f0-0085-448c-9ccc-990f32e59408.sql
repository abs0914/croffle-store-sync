-- Create repair function for missing product catalog entries
CREATE OR REPLACE FUNCTION repair_missing_product_catalog_entries()
RETURNS TABLE(repaired_count INTEGER, errors TEXT[])
LANGUAGE plpgsql
AS $$
DECLARE
  recipe_record RECORD;
  repaired_count INTEGER := 0;
  errors TEXT[] := ARRAY[]::TEXT[];
  catalog_product_id UUID;
BEGIN
  -- Find recipes without product catalog entries
  FOR recipe_record IN 
    SELECT r.id, r.name, r.description, r.suggested_price, r.total_cost, r.store_id, rt.image_url
    FROM recipes r
    LEFT JOIN recipe_templates rt ON r.template_id = rt.id
    LEFT JOIN product_catalog pc ON r.id = pc.recipe_id AND r.store_id = pc.store_id
    WHERE pc.id IS NULL 
      AND r.is_active = true
      AND r.approval_status = 'approved'
  LOOP
    BEGIN
      -- Create missing product catalog entry
      INSERT INTO product_catalog (
        store_id, 
        product_name, 
        description, 
        price, 
        is_available, 
        recipe_id,
        image_url,
        display_order
      ) VALUES (
        recipe_record.store_id,
        recipe_record.name,
        recipe_record.description,
        COALESCE(recipe_record.suggested_price, recipe_record.total_cost * 1.5),
        true,
        recipe_record.id,
        recipe_record.image_url,
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
      WHERE ri.recipe_id = recipe_record.id
        AND (ri.inventory_stock_id IS NOT NULL OR ri.commissary_item_id IS NOT NULL);

      repaired_count := repaired_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      errors := errors || (recipe_record.name || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN QUERY SELECT repaired_count, errors;
END;
$$;