-- Remove markup from create_product_from_approved_recipe function
CREATE OR REPLACE FUNCTION public.create_product_from_approved_recipe()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  new_product_id UUID;
  recipe_cost NUMERIC;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    
    -- Calculate recipe cost
    SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, ci.unit_cost, 0)), 0)
    INTO recipe_cost
    FROM recipe_ingredients ri
    LEFT JOIN commissary_inventory ci ON ri.commissary_item_id = ci.id
    WHERE ri.recipe_id = NEW.id;
    
    -- Create the product without markup - use cost as initial price
    INSERT INTO products (
      name,
      description,
      sku,
      price,
      cost,
      stock_quantity,
      store_id,
      is_active
    ) VALUES (
      NEW.name,
      NEW.description,
      'RCP-' || UPPER(REPLACE(NEW.name, ' ', '-')) || '-' || SUBSTRING(NEW.store_id::text, 1, 8),
      recipe_cost, -- Use cost directly without markup
      recipe_cost,
      0, -- Initial stock quantity
      NEW.store_id,
      true
    ) RETURNING id INTO new_product_id;
    
    -- Update the recipe with the product_id
    UPDATE recipes 
    SET product_id = new_product_id 
    WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$function$;