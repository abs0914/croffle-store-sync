-- Synchronize inventory items across all stores to match Sugbo Mercado (reference store)
CREATE OR REPLACE FUNCTION sync_inventory_across_stores()
RETURNS TABLE(
  store_name text,
  items_added integer,
  added_items text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  store_record RECORD;
  reference_item RECORD;
  items_added_count INTEGER;
  added_items_list TEXT[] := '{}';
BEGIN
  -- Reference items from Sugbo Mercado with their exact specifications
  FOR store_record IN 
    SELECT s.id, s.name 
    FROM stores s 
    WHERE s.is_active = true AND s.name NOT LIKE '%Sugbo%'
  LOOP
    items_added_count := 0;
    added_items_list := '{}';
    
    -- Add missing items based on Sugbo Mercado reference
    FOR reference_item IN
      SELECT 
        ist.item,
        ist.stock_quantity,
        ist.unit,
        ist.item_category,
        ist.cost,
        ist.minimum_threshold
      FROM inventory_stock ist
      JOIN stores s ON ist.store_id = s.id
      WHERE s.name LIKE '%Sugbo%' 
        AND ist.is_active = true
        AND ist.item IN ('Biscoff Biscuit', 'Creamer Sachet', 'Popsicle', 'Stirrer', 'Sugar Sachet')
        AND NOT EXISTS (
          SELECT 1 FROM inventory_stock existing
          WHERE existing.store_id = store_record.id 
            AND existing.item = ist.item 
            AND existing.is_active = true
        )
    LOOP
      -- Insert missing item
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
        store_record.id,
        reference_item.item,
        reference_item.unit,
        reference_item.stock_quantity,
        reference_item.minimum_threshold,
        reference_item.cost,
        reference_item.item_category,
        true,
        NOW(),
        NOW()
      );
      
      items_added_count := items_added_count + 1;
      added_items_list := added_items_list || reference_item.item;
    END LOOP;
    
    -- Return results for this store
    RETURN QUERY SELECT
      store_record.name::text,
      items_added_count,
      added_items_list;
  END LOOP;
END;
$$;

-- Execute the synchronization
SELECT * FROM sync_inventory_across_stores()
ORDER BY store_name;