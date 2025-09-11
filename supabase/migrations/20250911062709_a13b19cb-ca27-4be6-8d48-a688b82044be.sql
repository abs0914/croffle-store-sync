-- Create function to get recipe with ingredients for inventory deduction
CREATE OR REPLACE FUNCTION get_recipe_with_ingredients(p_product_id UUID)
RETURNS TABLE(
  ingredient_name TEXT,
  quantity NUMERIC,
  unit TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ri.ingredient_name::TEXT,
    ri.quantity,
    ri.unit::TEXT
  FROM product_catalog pc
  JOIN recipes r ON r.id = pc.recipe_id
  JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  WHERE pc.id = p_product_id
    AND pc.is_available = true
    AND pc.recipe_id IS NOT NULL
    AND r.is_active = true;
END;
$$;