
-- Add conversion factor and unit management to recipe template ingredients
ALTER TABLE recipe_template_ingredients 
ADD COLUMN IF NOT EXISTS purchase_unit TEXT,
ADD COLUMN IF NOT EXISTS recipe_unit TEXT,
ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS cost_per_recipe_unit NUMERIC;

-- Update recipe_unit to default to unit for existing records
UPDATE recipe_template_ingredients 
SET recipe_unit = unit 
WHERE recipe_unit IS NULL;

-- Add conversion factor and unit management to recipe ingredients  
ALTER TABLE recipe_ingredients
ADD COLUMN IF NOT EXISTS purchase_unit TEXT,
ADD COLUMN IF NOT EXISTS recipe_unit TEXT,
ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS cost_per_recipe_unit NUMERIC,
ADD COLUMN IF NOT EXISTS ingredient_name TEXT;

-- Update recipe_unit to default to unit for existing records
UPDATE recipe_ingredients 
SET recipe_unit = unit 
WHERE recipe_unit IS NULL;

-- Create ingredient unit conversions table for common conversions
CREATE TABLE IF NOT EXISTS ingredient_unit_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_name TEXT NOT NULL,
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  conversion_factor NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add some common conversions for the purchase order items
INSERT INTO ingredient_unit_conversions (ingredient_name, from_unit, to_unit, conversion_factor, notes) VALUES
('Regular Croissant', 'box', 'pieces', 70, '1 box contains 70 pieces'),
('Whipped Cream Mix', 'package', 'piping_bag', 12, '1 package makes 12 piping bags'),
('Monalisa', 'package', 'liters', 12, '1 package contains 12 liters')
ON CONFLICT DO NOTHING;

-- Create function to calculate cost per recipe unit
CREATE OR REPLACE FUNCTION calculate_cost_per_recipe_unit(
  purchase_cost NUMERIC,
  conversion_factor NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  IF conversion_factor > 0 THEN
    RETURN purchase_cost / conversion_factor;
  ELSE
    RETURN purchase_cost;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically calculate cost per recipe unit
CREATE OR REPLACE FUNCTION update_recipe_unit_costs()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate cost per recipe unit for recipe template ingredients
  IF TG_TABLE_NAME = 'recipe_template_ingredients' THEN
    NEW.cost_per_recipe_unit = calculate_cost_per_recipe_unit(
      COALESCE(NEW.cost_per_unit, 0), 
      COALESCE(NEW.conversion_factor, 1)
    );
  END IF;
  
  -- Calculate cost per recipe unit for recipe ingredients
  IF TG_TABLE_NAME = 'recipe_ingredients' THEN
    NEW.cost_per_recipe_unit = calculate_cost_per_recipe_unit(
      COALESCE(NEW.cost_per_unit, 0), 
      COALESCE(NEW.conversion_factor, 1)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_recipe_template_ingredient_costs ON recipe_template_ingredients;
DROP TRIGGER IF EXISTS trigger_update_recipe_ingredient_costs ON recipe_ingredients;

-- Create triggers
CREATE TRIGGER trigger_update_recipe_template_ingredient_costs
  BEFORE INSERT OR UPDATE ON recipe_template_ingredients
  FOR EACH ROW EXECUTE FUNCTION update_recipe_unit_costs();

CREATE TRIGGER trigger_update_recipe_ingredient_costs
  BEFORE INSERT OR UPDATE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION update_recipe_unit_costs();

-- Enable RLS on ingredient_unit_conversions
ALTER TABLE ingredient_unit_conversions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for ingredient_unit_conversions
CREATE POLICY "Allow read access to ingredient unit conversions"
ON ingredient_unit_conversions FOR SELECT
USING (true);

CREATE POLICY "Admin can manage ingredient unit conversions"
ON ingredient_unit_conversions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);
