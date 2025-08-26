-- Fix the create_recipe_deployment_record trigger function
-- Remove reference to non-existent created_by column

CREATE OR REPLACE FUNCTION public.create_recipe_deployment_record()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only create deployment record if recipe has a template_id
  IF NEW.template_id IS NOT NULL THEN
    INSERT INTO recipe_deployments (
      template_id,
      store_id,
      recipe_id,
      deployed_by,
      cost_snapshot,
      price_snapshot,
      deployment_notes
    ) VALUES (
      NEW.template_id,
      NEW.store_id,
      NEW.id,
      auth.uid(), -- Use auth.uid() directly since recipes table has no created_by column
      COALESCE(NEW.total_cost, 0),
      COALESCE(NEW.suggested_price, 0),
      'Auto-created from recipe deployment'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;