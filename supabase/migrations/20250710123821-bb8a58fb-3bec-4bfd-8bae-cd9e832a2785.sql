-- Update the validate_recipe_deployment function to handle case-insensitive matching
CREATE OR REPLACE FUNCTION public.validate_recipe_deployment(template_id_param uuid, store_id_param uuid)
RETURNS TABLE(is_valid boolean, error_message text, missing_ingredients text[])
LANGUAGE plpgsql
AS $function$
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
  
  -- Check for missing inventory items with case-insensitive matching and unit normalization
  SELECT ARRAY_AGG(rti.ingredient_name)
  INTO missing_items
  FROM recipe_template_ingredients rti
  LEFT JOIN inventory_stock ist ON (
    ist.store_id = store_id_param 
    AND LOWER(TRIM(ist.item)) = LOWER(TRIM(rti.ingredient_name))
    AND LOWER(TRIM(ist.unit)) = LOWER(TRIM(rti.unit))
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
$function$;