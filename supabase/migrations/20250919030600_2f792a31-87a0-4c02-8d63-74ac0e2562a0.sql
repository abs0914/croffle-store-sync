-- Complete inventory synchronization - add items missing from Sugbo Mercado to ensure all stores have identical inventory
CREATE OR REPLACE FUNCTION complete_inventory_sync()
RETURNS TABLE(
  action_type text,
  items_added integer,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  sugbo_store_id UUID;
  missing_item RECORD;
  items_added_count INTEGER := 0;
BEGIN
  -- Get Sugbo Mercado store ID
  SELECT s.id INTO sugbo_store_id
  FROM stores s 
  WHERE s.name LIKE '%Sugbo%' AND s.is_active = true
  LIMIT 1;
  
  -- Add items that exist in other stores but not in Sugbo Mercado
  FOR missing_item IN
    WITH sugbo_items AS (
      SELECT DISTINCT ist.item
      FROM inventory_stock ist
      WHERE ist.store_id = sugbo_store_id AND ist.is_active = true
    ),
    common_items AS (
      SELECT 
        ist.item,
        ist.stock_quantity,
        ist.unit,
        ist.item_category,
        ist.cost,
        ist.minimum_threshold,
        COUNT(DISTINCT ist.store_id) as store_count
      FROM inventory_stock ist
      JOIN stores s ON ist.store_id = s.id
      WHERE s.is_active = true 
        AND s.name NOT LIKE '%Sugbo%' 
        AND ist.is_active = true
        AND ist.item NOT IN (SELECT item FROM sugbo_items)
      GROUP BY ist.item, ist.stock_quantity, ist.unit, ist.item_category, ist.cost, ist.minimum_threshold
      HAVING COUNT(DISTINCT ist.store_id) >= 6  -- Items in at least 6 other stores
    )
    SELECT * FROM common_items
  LOOP
    -- Insert missing item into Sugbo Mercado
    INSERT INTO inventory_stock (
      store_id,
      item,
      unit,
      stock_quantity,
      minimum_threshold,
      cost,
      item_category,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      sugbo_store_id,
      missing_item.item,
      missing_item.unit,
      missing_item.stock_quantity,
      missing_item.minimum_threshold,
      missing_item.cost,
      missing_item.item_category,
      true,
      NOW(),
      NOW()
    );
    
    items_added_count := items_added_count + 1;
  END LOOP;
  
  -- Return results
  RETURN QUERY SELECT
    'added_to_sugbo'::text,
    items_added_count,
    'Added missing items to Sugbo Mercado to match other stores'::text;
END;
$$;

-- Execute the complete synchronization
SELECT * FROM complete_inventory_sync();