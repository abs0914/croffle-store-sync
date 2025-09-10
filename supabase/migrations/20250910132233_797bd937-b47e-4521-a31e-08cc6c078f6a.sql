-- Phase 1: Data Correction - Fix Americano Iced Recipe Ingredients
-- Update all "Espresso Shot" ingredients to "Coffee Beans" in recipe_ingredients table
UPDATE recipe_ingredients 
SET ingredient_name = 'Coffee Beans',
    updated_at = NOW()
WHERE ingredient_name = 'Espresso Shot';

-- Fix incorrect mappings where "Coffee Beans" ingredients point to "Espresso Shot" inventory items
-- First, let's update the recipe_ingredient_mappings to point to correct Coffee Beans inventory
UPDATE recipe_ingredient_mappings rim
SET inventory_stock_id = ist.id,
    updated_at = NOW()
FROM inventory_stock ist
WHERE rim.ingredient_name = 'Coffee Beans'
  AND ist.item = 'Coffee Beans'
  AND ist.is_active = true
  AND EXISTS (
    SELECT 1 FROM inventory_stock old_ist 
    WHERE old_ist.id = rim.inventory_stock_id 
    AND old_ist.item = 'Espresso Shot'
  );

-- Update recipe_ingredients table to point to correct Coffee Beans inventory items
UPDATE recipe_ingredients ri
SET inventory_stock_id = ist.id,
    updated_at = NOW()
FROM inventory_stock ist
WHERE ri.ingredient_name = 'Coffee Beans'
  AND ist.item = 'Coffee Beans'
  AND ist.is_active = true
  AND EXISTS (
    SELECT 1 FROM inventory_stock old_ist 
    WHERE old_ist.id = ri.inventory_stock_id 
    AND old_ist.item = 'Espresso Shot'
  );

-- Create validation function to ensure recipe-inventory consistency
CREATE OR REPLACE FUNCTION validate_recipe_inventory_consistency()
RETURNS TABLE(
  recipe_name text,
  ingredient_name text,
  has_inventory_mapping boolean,
  inventory_item_name text,
  is_consistent boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.name::text as recipe_name,
    ri.ingredient_name::text,
    (ri.inventory_stock_id IS NOT NULL) as has_inventory_mapping,
    COALESCE(ist.item, 'UNMAPPED')::text as inventory_item_name,
    (ri.ingredient_name = ist.item OR ri.inventory_stock_id IS NULL) as is_consistent
  FROM recipes r
  JOIN recipe_ingredients ri ON r.id = ri.recipe_id
  LEFT JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
  WHERE r.is_active = true
  ORDER BY r.name, ri.ingredient_name;
END;
$$;