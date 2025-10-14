-- Phase 3: Prevent Future Cross-Store Recipe Ingredient Mappings
-- This trigger ensures recipe ingredients can only be mapped to inventory from the same store

-- Create function to validate same-store mapping
CREATE OR REPLACE FUNCTION public.validate_recipe_ingredient_store_match()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_recipe_store_id uuid;
  v_inventory_store_id uuid;
  v_recipe_name text;
  v_inventory_item text;
BEGIN
  -- Get recipe's store_id
  SELECT store_id, name INTO v_recipe_store_id, v_recipe_name
  FROM recipes
  WHERE id = NEW.recipe_id;
  
  -- If recipe not found, allow (will be caught by foreign key constraint)
  IF v_recipe_store_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get inventory's store_id
  SELECT store_id, item INTO v_inventory_store_id, v_inventory_item
  FROM inventory_stock
  WHERE id = NEW.inventory_stock_id;
  
  -- If inventory not found, allow (will be caught by foreign key constraint)
  IF v_inventory_store_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if stores match
  IF v_recipe_store_id != v_inventory_store_id THEN
    RAISE EXCEPTION 'Cross-store inventory mapping prevented: Recipe "%" belongs to store %, but inventory item "%" belongs to store %. Recipe ingredients must use inventory from the same store.',
      v_recipe_name,
      v_recipe_store_id,
      v_inventory_item,
      v_inventory_store_id
    USING HINT = 'Select inventory items from the same store as the recipe';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on recipe_ingredients table
DROP TRIGGER IF EXISTS enforce_same_store_recipe_ingredient_mapping ON recipe_ingredients;

CREATE TRIGGER enforce_same_store_recipe_ingredient_mapping
  BEFORE INSERT OR UPDATE OF inventory_stock_id, recipe_id
  ON recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_recipe_ingredient_store_match();

-- Add helpful comment
COMMENT ON FUNCTION public.validate_recipe_ingredient_store_match() IS 
  'Phase 3: Prevents cross-store inventory mappings by validating that recipe ingredients only reference inventory from the same store as the recipe';

COMMENT ON TRIGGER enforce_same_store_recipe_ingredient_mapping ON recipe_ingredients IS
  'Phase 3: Enforces same-store validation for recipe ingredient mappings to prevent cross-store inventory deductions';