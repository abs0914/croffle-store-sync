
-- Phase 1: Database Cleanup - Remove duplicate and empty recipe templates

-- First, let's identify and remove recipe templates that have no ingredients
DELETE FROM recipe_template_ingredients 
WHERE recipe_template_id IN (
  SELECT rt.id 
  FROM recipe_templates rt 
  LEFT JOIN recipe_template_ingredients rti ON rt.id = rti.recipe_template_id 
  WHERE rti.id IS NULL
);

-- Remove recipe templates that have no ingredients (template shells)
DELETE FROM recipe_templates 
WHERE id NOT IN (
  SELECT DISTINCT recipe_template_id 
  FROM recipe_template_ingredients
);

-- Clean up duplicate recipe templates - keep the one with the most recent created_at
WITH duplicate_templates AS (
  SELECT name, 
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC, id) as rn,
         id
  FROM recipe_templates
),
templates_to_delete AS (
  SELECT id FROM duplicate_templates WHERE rn > 1
)
DELETE FROM recipe_template_ingredients 
WHERE recipe_template_id IN (SELECT id FROM templates_to_delete);

DELETE FROM recipe_templates 
WHERE id IN (
  SELECT id FROM (
    SELECT name, 
           ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC, id) as rn,
           id
    FROM recipe_templates
  ) ranked 
  WHERE rn > 1
);

-- Add constraint to ensure recipe templates must have at least one ingredient
-- We'll do this via a function since CHECK constraints can't reference other tables
CREATE OR REPLACE FUNCTION validate_recipe_template_has_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate for active templates
  IF NEW.is_active = true THEN
    -- Check if template has ingredients
    IF NOT EXISTS (
      SELECT 1 FROM recipe_template_ingredients 
      WHERE recipe_template_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Recipe template must have at least one ingredient before activation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate recipe templates have ingredients when activated
DROP TRIGGER IF EXISTS validate_recipe_template_ingredients ON recipe_templates;
CREATE TRIGGER validate_recipe_template_ingredients
  BEFORE UPDATE ON recipe_templates
  FOR EACH ROW
  EXECUTE FUNCTION validate_recipe_template_has_ingredients();

-- Update recipe_template_ingredients table to include missing columns for better mapping
ALTER TABLE recipe_template_ingredients 
ADD COLUMN IF NOT EXISTS recipe_unit TEXT DEFAULT 'g',
ADD COLUMN IF NOT EXISTS purchase_unit TEXT DEFAULT 'g', 
ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'all',
ADD COLUMN IF NOT EXISTS cost_per_recipe_unit NUMERIC DEFAULT 0;

-- Add index for better performance on template ingredient lookups
CREATE INDEX IF NOT EXISTS idx_recipe_template_ingredients_template_id 
ON recipe_template_ingredients(recipe_template_id);

-- Add index for better performance on commissary item lookups
CREATE INDEX IF NOT EXISTS idx_recipe_template_ingredients_commissary_item 
ON recipe_template_ingredients(commissary_item_name);
