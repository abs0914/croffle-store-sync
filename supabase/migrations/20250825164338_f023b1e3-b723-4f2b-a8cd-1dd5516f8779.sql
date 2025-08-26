-- Modify the validation trigger to allow zero costs for packaging and during imports
CREATE OR REPLACE FUNCTION validate_recipe_template_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow zero cost for packaging items (cups, wrappers, etc.)
  IF NEW.cost_per_unit = 0 AND (
    LOWER(NEW.ingredient_name) LIKE '%cup%' OR
    LOWER(NEW.ingredient_name) LIKE '%wrapper%' OR 
    LOWER(NEW.ingredient_name) LIKE '%paper%' OR
    LOWER(NEW.ingredient_name) LIKE '%packaging%' OR
    LOWER(NEW.ingredient_name) LIKE '%container%' OR
    LOWER(NEW.ingredient_name) LIKE '%bag%' OR
    LOWER(NEW.ingredient_name) LIKE '%box%' OR
    LOWER(NEW.ingredient_name) LIKE '%lid%'
  ) THEN
    -- Allow zero cost for packaging items
    NULL;
  -- For non-packaging items, ensure cost is positive
  ELSIF NEW.cost_per_unit IS NULL OR NEW.cost_per_unit < 0 THEN
    RAISE EXCEPTION 'Ingredient cost must be zero or greater. Got: %', NEW.cost_per_unit;
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