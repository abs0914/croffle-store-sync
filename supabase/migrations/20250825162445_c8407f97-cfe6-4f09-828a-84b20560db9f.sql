-- Add RLS policies for new tables
ALTER TABLE inventory_stock_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE standardized_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS policies for backup tables (admin only)
CREATE POLICY "Admins can manage inventory stock backup" ON inventory_stock_backup FOR ALL USING (is_admin_or_owner());
CREATE POLICY "Admins can manage purchase order items backup" ON purchase_order_items_backup FOR ALL USING (is_admin_or_owner());
CREATE POLICY "Admins can manage recipe ingredients backup" ON recipe_ingredients_backup FOR ALL USING (is_admin_or_owner());

-- RLS policies for standardized ingredients (read for authenticated, manage for admins)
CREATE POLICY "Authenticated users can view standardized ingredients" ON standardized_ingredients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage standardized ingredients" ON standardized_ingredients FOR ALL USING (is_admin_or_owner());

-- Function to auto-generate store inventory based on recipe ingredients
CREATE OR REPLACE FUNCTION generate_store_inventory_from_recipes()
RETURNS TABLE(
  stores_processed INTEGER,
  items_created INTEGER,
  execution_details JSONB
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'auth' AS $$
DECLARE
  store_record RECORD;
  ingredient_record RECORD;
  stores_count INTEGER := 0;
  items_count INTEGER := 0;
  details JSONB[] := '{}';
BEGIN
  -- Process each active store
  FOR store_record IN 
    SELECT id, name FROM stores WHERE is_active = true
  LOOP
    stores_count := stores_count + 1;
    
    -- Get unique standardized ingredients needed for this store's recipes
    FOR ingredient_record IN 
      SELECT DISTINCT
        si.standardized_name,
        si.standardized_unit,
        si.category
      FROM recipe_ingredients ri
      JOIN recipes r ON ri.recipe_id = r.id
      JOIN standardized_ingredients si ON LOWER(TRIM(ri.ingredient_name)) = LOWER(TRIM(si.ingredient_name))
      WHERE r.store_id = store_record.id 
        AND r.is_active = true
    LOOP
      -- Insert inventory item if it doesn't exist
      INSERT INTO inventory_stock (
        store_id,
        item,
        category,
        unit,
        current_stock,
        minimum_threshold,
        cost,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        store_record.id,
        ingredient_record.standardized_name,
        ingredient_record.category,
        ingredient_record.standardized_unit,
        0, -- Set quantity to 0 as requested
        5, -- Default minimum threshold
        0, -- Will be updated from commissary or manually
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (store_id, item) DO NOTHING; -- Prevent duplicates
      
      -- Count if item was actually inserted
      IF FOUND THEN
        items_count := items_count + 1;
        
        details := details || jsonb_build_object(
          'store_name', store_record.name,
          'item_name', ingredient_record.standardized_name,
          'category', ingredient_record.category,
          'unit', ingredient_record.standardized_unit
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT 
    stores_count,
    items_count,
    jsonb_build_object(
      'created_items', details,
      'summary', jsonb_build_object(
        'stores_processed', stores_count,
        'items_created', items_count
      )
    );
END;
$$;