-- Fix zero-cost ingredients and add data validation for recipe management (corrected)

-- Update zero-cost ingredients with reasonable default costs
UPDATE recipe_template_ingredients 
SET cost_per_unit = CASE 
  WHEN ingredient_name ILIKE '%espresso%' THEN 2.50
  WHEN ingredient_name ILIKE '%milk%' THEN 0.05
  WHEN ingredient_name ILIKE '%water%' THEN 0.01
  WHEN ingredient_name ILIKE '%ice%' THEN 0.02
  WHEN ingredient_name ILIKE '%syrup%' THEN 1.25
  WHEN ingredient_name ILIKE '%croissant%' THEN 15.00
  WHEN ingredient_name ILIKE '%biscoff%' THEN 3.50
  WHEN ingredient_name ILIKE '%oreo%' THEN 2.00
  WHEN ingredient_name ILIKE '%strawberry%' THEN 1.50
  WHEN ingredient_name ILIKE '%caramel%' THEN 1.25
  WHEN ingredient_name ILIKE '%chocolate%' THEN 1.75
  WHEN ingredient_name ILIKE '%vanilla%' THEN 1.00
  WHEN ingredient_name ILIKE '%paper%' OR ingredient_name ILIKE '%chopstick%' THEN 0.25
  WHEN ingredient_name ILIKE '%packaging%' OR ingredient_name ILIKE '%wrapper%' THEN 0.15
  ELSE 1.00 -- Default cost for unrecognized ingredients
END
WHERE cost_per_unit = 0 OR cost_per_unit IS NULL;

-- Add validation constraints for recipe templates
CREATE OR REPLACE FUNCTION validate_recipe_template_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure cost_per_unit is not null or zero for active templates
  IF NEW.cost_per_unit IS NULL OR NEW.cost_per_unit <= 0 THEN
    RAISE EXCEPTION 'Ingredient cost must be greater than zero. Got: %', NEW.cost_per_unit;
  END IF;
  
  -- Ensure quantity is positive
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Ingredient quantity must be greater than zero. Got: %', NEW.quantity;
  END IF;
  
  -- Ensure ingredient name is not empty
  IF NEW.ingredient_name IS NULL OR trim(NEW.ingredient_name) = '' THEN
    RAISE EXCEPTION 'Ingredient name cannot be empty';
  END IF;
  
  -- Ensure unit is not empty
  IF NEW.unit IS NULL OR trim(NEW.unit) = '' THEN
    RAISE EXCEPTION 'Unit cannot be empty';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for recipe template ingredient validation
DROP TRIGGER IF EXISTS validate_recipe_template_cost_trigger ON recipe_template_ingredients;
CREATE TRIGGER validate_recipe_template_cost_trigger
  BEFORE INSERT OR UPDATE ON recipe_template_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION validate_recipe_template_cost();

-- Fix any existing recipes with zero costs
UPDATE recipes r
SET total_cost = (
  SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, ci.unit_cost, 1.0)), 0)
  FROM recipe_ingredients ri
  LEFT JOIN commissary_inventory ci ON ri.commissary_item_id = ci.id
  WHERE ri.recipe_id = r.id
),
cost_per_serving = (
  SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, ci.unit_cost, 1.0)), 0) / GREATEST(r.serving_size, 1)
  FROM recipe_ingredients ri
  LEFT JOIN commissary_inventory ci ON ri.commissary_item_id = ci.id
  WHERE ri.recipe_id = r.id
)
WHERE total_cost = 0 OR total_cost IS NULL;

-- Add index for better performance on recipe cost calculations
CREATE INDEX IF NOT EXISTS idx_recipe_template_ingredients_template_id ON recipe_template_ingredients(recipe_template_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);