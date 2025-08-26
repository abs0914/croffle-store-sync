-- Phase 1: Fix all croffle recipe ingredient quantities and units using valid enum values
-- Fix Cookies & Cream Croffle recipes across all stores
UPDATE recipe_ingredients 
SET 
  quantity = 1,
  unit = 'pieces',
  updated_at = NOW()
WHERE ingredient_name ILIKE '%crushed oreo%' 
  AND recipe_id IN (
    SELECT r.id FROM recipes r 
    WHERE r.name ILIKE '%cookies%cream%croffle%' 
    OR r.name ILIKE '%oreo%croffle%'
  );

-- Fix Biscoff Croffle recipes across all stores  
UPDATE recipe_ingredients
SET 
  quantity = 1,
  unit = 'pieces',
  updated_at = NOW()
WHERE ingredient_name ILIKE '%biscoff crushed%'
  AND recipe_id IN (
    SELECT r.id FROM recipes r
    WHERE r.name ILIKE '%biscoff%croffle%'
  );

-- Create recipe audit function to compare templates vs deployed recipes
CREATE OR REPLACE FUNCTION audit_recipe_template_consistency()
RETURNS TABLE(
  template_name TEXT,
  store_name TEXT,
  ingredient_name TEXT,
  template_quantity NUMERIC,
  template_unit TEXT,
  deployed_quantity NUMERIC,
  deployed_unit TEXT,
  status TEXT,
  issue_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN QUERY
  WITH template_ingredients AS (
    SELECT 
      rt.name as template_name,
      rti.ingredient_name,
      rti.quantity as template_quantity,
      rti.unit as template_unit
    FROM recipe_templates rt
    JOIN recipe_template_ingredients rti ON rt.id = rti.recipe_template_id
    WHERE rt.is_active = true
  ),
  deployed_ingredients AS (
    SELECT 
      r.template_id,
      s.name as store_name,
      ri.ingredient_name,
      ri.quantity as deployed_quantity,
      ri.unit as deployed_unit
    FROM recipes r
    JOIN stores s ON r.store_id = s.id
    JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    WHERE r.is_active = true AND r.template_id IS NOT NULL
  )
  SELECT 
    ti.template_name::TEXT,
    COALESCE(di.store_name, 'Missing Deployment')::TEXT,
    ti.ingredient_name::TEXT,
    ti.template_quantity,
    ti.template_unit::TEXT,
    COALESCE(di.deployed_quantity, 0),
    COALESCE(di.deployed_unit, 'Missing')::TEXT,
    CASE 
      WHEN di.store_name IS NULL THEN 'Missing'
      WHEN ti.template_quantity != di.deployed_quantity THEN 'Quantity Mismatch'
      WHEN ti.template_unit != di.deployed_unit THEN 'Unit Mismatch'
      ELSE 'Match'
    END::TEXT,
    CASE 
      WHEN di.store_name IS NULL THEN 'missing_deployment'
      WHEN ti.template_quantity != di.deployed_quantity THEN 'quantity_mismatch'
      WHEN ti.template_unit != di.deployed_unit THEN 'unit_mismatch'
      ELSE 'consistent'
    END::TEXT
  FROM template_ingredients ti
  LEFT JOIN deployed_ingredients di ON ti.template_name = (
    SELECT rt.name FROM recipe_templates rt WHERE rt.id = di.template_id
  ) AND LOWER(TRIM(ti.ingredient_name)) = LOWER(TRIM(di.ingredient_name))
  ORDER BY ti.template_name, di.store_name, ti.ingredient_name;
END;
$$;

-- Create function to sync deployed recipes with templates
CREATE OR REPLACE FUNCTION sync_recipes_with_templates(p_template_ids UUID[] DEFAULT NULL)
RETURNS TABLE(
  recipes_updated INTEGER,
  ingredients_updated INTEGER,  
  stores_affected INTEGER,
  sync_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  recipe_count INTEGER := 0;
  ingredient_count INTEGER := 0;
  store_count INTEGER := 0;
  sync_record RECORD;
  template_record RECORD;
  ingredients_added INTEGER;
BEGIN
  -- Get templates to sync (all active if none specified)
  FOR template_record IN 
    SELECT rt.id, rt.name 
    FROM recipe_templates rt 
    WHERE rt.is_active = true 
    AND (p_template_ids IS NULL OR rt.id = ANY(p_template_ids))
  LOOP
    -- Update all deployed recipes for this template
    FOR sync_record IN
      SELECT r.id as recipe_id, r.store_id, s.name as store_name
      FROM recipes r
      JOIN stores s ON r.store_id = s.id
      WHERE r.template_id = template_record.id
      AND r.is_active = true
      AND s.is_active = true
    LOOP
      -- Clear existing ingredients for this recipe
      DELETE FROM recipe_ingredients WHERE recipe_id = sync_record.recipe_id;
      
      -- Copy template ingredients to recipe
      INSERT INTO recipe_ingredients (
        recipe_id,
        ingredient_name,
        quantity,
        unit,
        cost_per_unit,
        created_at,
        updated_at
      )
      SELECT 
        sync_record.recipe_id,
        rti.ingredient_name,
        rti.quantity,
        rti.unit,
        rti.cost_per_unit,
        NOW(),
        NOW()
      FROM recipe_template_ingredients rti
      WHERE rti.recipe_template_id = template_record.id;
      
      GET DIAGNOSTICS ingredients_added = ROW_COUNT;
      
      recipe_count := recipe_count + 1;
      ingredient_count := ingredient_count + ingredients_added;
    END LOOP;
  END LOOP;
  
  -- Count distinct stores affected
  SELECT COUNT(DISTINCT r.store_id) INTO store_count
  FROM recipes r
  WHERE r.template_id = ANY(
    SELECT rt.id FROM recipe_templates rt 
    WHERE rt.is_active = true 
    AND (p_template_ids IS NULL OR rt.id = ANY(p_template_ids))
  );
  
  RETURN QUERY SELECT 
    recipe_count,
    ingredient_count,
    store_count,
    jsonb_build_object(
      'templates_synced', COALESCE(array_length(p_template_ids, 1), (SELECT COUNT(*) FROM recipe_templates WHERE is_active = true)),
      'sync_timestamp', NOW(),
      'sync_type', CASE WHEN p_template_ids IS NULL THEN 'full_sync' ELSE 'selective_sync' END
    );
END;
$$;