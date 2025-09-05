-- Fix the inventory mapping function by removing similarity function
CREATE OR REPLACE FUNCTION public.create_advanced_inventory_mappings()
RETURNS TABLE(mappings_created integer, stores_processed integer, mapping_details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  store_record RECORD;
  ingredient_record RECORD;
  inventory_item RECORD;
  mappings_count INTEGER := 0;
  stores_count INTEGER := 0;
  mapping_details jsonb[] := '{}';
BEGIN
  -- Process each store
  FOR store_record IN 
    SELECT id, name FROM stores WHERE is_active = true
  LOOP
    stores_count := stores_count + 1;
    
    -- Get all unique recipe ingredients for this store that need mapping
    FOR ingredient_record IN 
      SELECT DISTINCT 
        ri.ingredient_name,
        ri.recipe_id,
        r.name as recipe_name
      FROM recipe_ingredients ri
      JOIN recipes r ON ri.recipe_id = r.id
      WHERE r.store_id = store_record.id
        AND r.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM recipe_ingredient_mappings rim
          WHERE rim.recipe_id = ri.recipe_id
            AND rim.ingredient_name = ri.ingredient_name
        )
    LOOP
      -- Find best matching inventory item using pattern matching
      SELECT 
        ist.id,
        ist.item
      INTO inventory_item
      FROM inventory_stock ist
      WHERE ist.store_id = store_record.id
        AND ist.is_active = true
        AND (
          -- Exact match (highest priority)
          LOWER(TRIM(ist.item)) = LOWER(TRIM(ingredient_record.ingredient_name))
          OR 
          -- Contains ingredient name
          LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(ingredient_record.ingredient_name)) || '%'
          OR
          -- Ingredient contains inventory item name
          LOWER(TRIM(ingredient_record.ingredient_name)) LIKE '%' || LOWER(TRIM(ist.item)) || '%'
          OR
          -- Common ingredient variations and synonyms
          (LOWER(ingredient_record.ingredient_name) LIKE '%croissant%' AND LOWER(ist.item) LIKE '%croissant%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%graham%' AND LOWER(ist.item) LIKE '%graham%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%blueberry%' AND LOWER(ist.item) LIKE '%blueberry%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%cream%' AND LOWER(ist.item) LIKE '%cream%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%whip%' AND LOWER(ist.item) LIKE '%whip%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%chocolate%' AND LOWER(ist.item) LIKE '%chocolate%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%marshmallow%' AND LOWER(ist.item) LIKE '%marshmallow%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%caramel%' AND LOWER(ist.item) LIKE '%caramel%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%strawberry%' AND LOWER(ist.item) LIKE '%strawberry%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%milk%' AND LOWER(ist.item) LIKE '%milk%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%sugar%' AND LOWER(ist.item) LIKE '%sugar%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%chopstick%' AND LOWER(ist.item) LIKE '%chopstick%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%paper%' AND LOWER(ist.item) LIKE '%paper%')
          OR (LOWER(ingredient_record.ingredient_name) LIKE '%wax%' AND LOWER(ist.item) LIKE '%wax%')
        )
      ORDER BY 
        CASE 
          WHEN LOWER(TRIM(ist.item)) = LOWER(TRIM(ingredient_record.ingredient_name)) THEN 1
          WHEN LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(ingredient_record.ingredient_name)) || '%' THEN 2
          ELSE 3
        END
      LIMIT 1;
      
      -- Create mapping if we found a match
      IF inventory_item.id IS NOT NULL THEN
        INSERT INTO recipe_ingredient_mappings (
          recipe_id,
          ingredient_name,
          inventory_stock_id,
          conversion_factor,
          created_at,
          updated_at
        ) VALUES (
          ingredient_record.recipe_id,
          ingredient_record.ingredient_name,
          inventory_item.id,
          1.0, -- Default conversion factor
          NOW(),
          NOW()
        );
        
        mappings_count := mappings_count + 1;
        
        -- Track mapping details
        mapping_details := mapping_details || jsonb_build_object(
          'store_name', store_record.name,
          'recipe_name', ingredient_record.recipe_name,
          'ingredient_name', ingredient_record.ingredient_name,
          'inventory_item', inventory_item.item
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT 
    mappings_count,
    stores_count,
    jsonb_build_object(
      'mappings_created', mapping_details,
      'summary', jsonb_build_object(
        'total_mappings', mappings_count,
        'stores_processed', stores_count
      )
    );
END;
$function$;