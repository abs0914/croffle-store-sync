-- Recipe System Complete Reset Migration (Fixed)
-- Phase 1: Clean Slate Approach - Fix Foreign Key Order

-- Step 1: Clear all existing recipe data in CORRECT order to respect foreign keys
DELETE FROM recipe_deployment_errors;
DELETE FROM recipe_deployments;
DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes);
DELETE FROM recipes;
DELETE FROM recipe_template_ingredients WHERE recipe_template_id IN (SELECT id FROM recipe_templates);
DELETE FROM recipe_templates;

-- Step 2: Clear any products created from recipes
DELETE FROM products WHERE sku LIKE 'RCP-%';

-- Step 3: Add missing columns to recipe_templates for better management
ALTER TABLE recipe_templates 
ADD COLUMN IF NOT EXISTS recipe_type TEXT DEFAULT 'regular' CHECK (recipe_type IN ('regular', 'addon', 'combo', 'beverage')),
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS suggested_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS serving_size INTEGER DEFAULT 1;

-- Step 4: Add missing columns to recipes for deployment tracking
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS recipe_type TEXT DEFAULT 'regular' CHECK (recipe_type IN ('regular', 'addon', 'combo', 'beverage')),
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS serving_size INTEGER DEFAULT 1;

-- Step 5: Improve recipe_template_ingredients table
ALTER TABLE recipe_template_ingredients 
ADD COLUMN IF NOT EXISTS commissary_item_id UUID REFERENCES commissary_inventory(id),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 6: Improve recipe_ingredients table  
ALTER TABLE recipe_ingredients 
ADD COLUMN IF NOT EXISTS commissary_item_id UUID REFERENCES commissary_inventory(id),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 7: Create recipe deployment errors table if not exists
CREATE TABLE IF NOT EXISTS recipe_deployment_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES recipe_templates(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES app_users(user_id)
);

-- Step 8: Add RLS policies for new table
ALTER TABLE recipe_deployment_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view deployment errors for their stores" ON recipe_deployment_errors;
CREATE POLICY "Users can view deployment errors for their stores" ON recipe_deployment_errors
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
  )
);

DROP POLICY IF EXISTS "Users can manage deployment errors for their stores" ON recipe_deployment_errors;
CREATE POLICY "Users can manage deployment errors for their stores" ON recipe_deployment_errors
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
  )
);

-- Step 9: Create function to calculate recipe cost from template
CREATE OR REPLACE FUNCTION calculate_template_cost(template_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_cost NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(rti.quantity * rti.cost_per_unit), 0)
  INTO total_cost
  FROM recipe_template_ingredients rti
  WHERE rti.recipe_template_id = template_id_param;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create function to generate unique recipe SKU
CREATE OR REPLACE FUNCTION generate_recipe_sku(recipe_name TEXT, recipe_type TEXT DEFAULT 'regular')
RETURNS TEXT AS $$
DECLARE
  base_sku TEXT;
  counter INTEGER := 1;
  final_sku TEXT;
BEGIN
  -- Create base SKU from name and type
  base_sku := UPPER(SUBSTRING(recipe_type, 1, 3)) || '-' || 
              UPPER(REGEXP_REPLACE(SUBSTRING(recipe_name, 1, 15), '[^A-Za-z0-9]', '', 'g'));
  
  final_sku := base_sku;
  
  -- Check for duplicates and add counter if needed
  WHILE EXISTS (
    SELECT 1 FROM products WHERE sku = final_sku
    UNION ALL
    SELECT 1 FROM recipe_templates WHERE sku = final_sku
    UNION ALL  
    SELECT 1 FROM recipes WHERE sku = final_sku
  ) LOOP
    counter := counter + 1;
    final_sku := base_sku || '-' || counter::TEXT;
  END LOOP;
  
  RETURN final_sku;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Update recipe cost calculation trigger
CREATE OR REPLACE FUNCTION update_recipe_costs()
RETURNS TRIGGER AS $$
BEGIN
  -- Update recipe total cost and cost per serving
  UPDATE recipes SET
    total_cost = (
      SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
      FROM recipe_ingredients ri
      WHERE ri.recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
    ),
    cost_per_serving = (
      SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0) / GREATEST(serving_size, 1)
      FROM recipe_ingredients ri
      WHERE ri.recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
    )
  WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_recipe_costs ON recipe_ingredients;
CREATE TRIGGER trigger_update_recipe_costs
  AFTER INSERT OR UPDATE OR DELETE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION update_recipe_costs();

-- Step 12: Create validation function for recipe deployment
CREATE OR REPLACE FUNCTION validate_recipe_deployment(
  template_id_param UUID,
  store_id_param UUID
) RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  missing_ingredients TEXT[]
) AS $$
DECLARE
  missing_items TEXT[] := '{}';
  template_exists BOOLEAN;
  store_exists BOOLEAN;
BEGIN
  -- Check if template exists
  SELECT EXISTS(SELECT 1 FROM recipe_templates WHERE id = template_id_param AND is_active = true)
  INTO template_exists;
  
  -- Check if store exists  
  SELECT EXISTS(SELECT 1 FROM stores WHERE id = store_id_param)
  INTO store_exists;
  
  IF NOT template_exists THEN
    RETURN QUERY SELECT false, 'Recipe template not found or inactive', missing_items;
    RETURN;
  END IF;
  
  IF NOT store_exists THEN
    RETURN QUERY SELECT false, 'Store not found', missing_items;
    RETURN;
  END IF;
  
  -- Check for missing inventory items
  SELECT ARRAY_AGG(rti.ingredient_name)
  INTO missing_items
  FROM recipe_template_ingredients rti
  LEFT JOIN inventory_stock ist ON (
    ist.store_id = store_id_param 
    AND ist.item = rti.ingredient_name 
    AND ist.unit = rti.unit
    AND ist.is_active = true
  )
  WHERE rti.recipe_template_id = template_id_param
  AND ist.id IS NULL;
  
  IF array_length(missing_items, 1) > 0 THEN
    RETURN QUERY SELECT false, 'Missing inventory items in target store', missing_items;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Validation passed', missing_items;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create comprehensive recipe deployment log
CREATE TABLE IF NOT EXISTS recipe_deployment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES recipe_templates(id),
  store_id UUID REFERENCES stores(id), 
  recipe_id UUID REFERENCES recipes(id),
  product_id UUID REFERENCES products(id),
  deployment_status TEXT NOT NULL CHECK (deployment_status IN ('started', 'recipe_created', 'ingredients_added', 'product_created', 'completed', 'failed')),
  step_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deployed_by UUID REFERENCES app_users(user_id)
);

-- Add RLS for deployment logs
ALTER TABLE recipe_deployment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view deployment logs for their stores" ON recipe_deployment_logs;
CREATE POLICY "Users can view deployment logs for their stores" ON recipe_deployment_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
  )
);

DROP POLICY IF EXISTS "System can manage deployment logs" ON recipe_deployment_logs;
CREATE POLICY "System can manage deployment logs" ON recipe_deployment_logs
FOR ALL USING (true);

-- Step 14: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_template_store ON recipes(template_id, store_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_template_ingredients_template ON recipe_template_ingredients(recipe_template_id);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_template_store ON recipe_deployment_logs(template_id, store_id);

-- Verification query
SELECT 
  'Recipe Templates' as table_name, COUNT(*) as record_count FROM recipe_templates
UNION ALL
SELECT 
  'Recipe Ingredients', COUNT(*) FROM recipe_template_ingredients  
UNION ALL
SELECT 
  'Deployed Recipes', COUNT(*) FROM recipes
UNION ALL
SELECT 
  'Recipe Products', COUNT(*) FROM products WHERE sku LIKE 'RCP-%'
ORDER BY table_name;