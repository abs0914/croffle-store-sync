-- Phase 1: Store Inventory Cleanup (Fixed)
-- Create backup table for existing inventory data
CREATE TABLE IF NOT EXISTS inventory_stock_backup AS 
SELECT * FROM inventory_stock;

-- Handle foreign key constraints before clearing inventory
-- Set inventory references to NULL in purchase_order_items
UPDATE purchase_order_items SET inventory_stock_id = NULL WHERE inventory_stock_id IS NOT NULL;

-- Set inventory references to NULL in recipe_ingredients if they exist
UPDATE recipe_ingredients SET inventory_stock_id = NULL WHERE inventory_stock_id IS NOT NULL;

-- Clear all store inventory items (keep commissary untouched)
DELETE FROM inventory_stock;

-- Create standardized ingredient categories lookup
CREATE TABLE IF NOT EXISTS standardized_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL UNIQUE,
  standardized_name TEXT NOT NULL,
  standardized_unit inventory_unit NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standardized ingredients based on recipe analysis
INSERT INTO standardized_ingredients (ingredient_name, standardized_name, standardized_unit, category) VALUES
-- Base ingredients
('espresso shot', 'Espresso Shot', 'ml', 'base_ingredient'),
('coffee', 'Coffee Beans', 'g', 'base_ingredient'),
('milk', 'Fresh Milk', 'ml', 'base_ingredient'),
('whole milk', 'Fresh Milk', 'ml', 'base_ingredient'),
('steamed milk', 'Fresh Milk', 'ml', 'base_ingredient'),
-- Syrups and sauces
('vanilla syrup', 'Vanilla Syrup', 'ml', 'classic_sauce'),
('caramel syrup', 'Caramel Syrup', 'ml', 'classic_sauce'),
('chocolate syrup', 'Chocolate Syrup', 'ml', 'classic_sauce'),
('strawberry syrup', 'Strawberry Syrup', 'ml', 'premium_sauce'),
('chocolate sauce', 'Chocolate Sauce', 'ml', 'classic_sauce'),
('caramel sauce', 'Caramel Sauce', 'ml', 'classic_sauce'),
-- Toppings and crumbles
('whipped cream', 'Whipped Cream', 'ml', 'classic_topping'),
('chocolate crumble', 'Chocolate Crumble', 'g', 'classic_topping'),
('oreo crushed', 'Oreo Crushed', 'g', 'premium_topping'),
('strawberry bits', 'Strawberry Bits', 'g', 'premium_topping'),
-- Packaging
('cup', 'Regular Cup', 'pieces', 'packaging'),
('plastic cup', 'Plastic Cup', 'pieces', 'packaging'),
-- Pastries
('croissant', 'Regular Croissant', 'pieces', 'biscuit'),
('regular croissant', 'Regular Croissant', 'pieces', 'biscuit'),
-- Ice and water
('ice', 'Ice Cubes', 'g', 'base_ingredient'),
('water', 'Water', 'ml', 'base_ingredient'),
('hot water', 'Water', 'ml', 'base_ingredient'),
('cold water', 'Water', 'ml', 'base_ingredient')
ON CONFLICT (ingredient_name) DO NOTHING;

-- Function to auto-generate store inventory based on recipe ingredients
CREATE OR REPLACE FUNCTION generate_store_inventory_from_recipes()
RETURNS TABLE(
  stores_processed INTEGER,
  items_created INTEGER,
  execution_details JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
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