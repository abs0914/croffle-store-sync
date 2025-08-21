-- Phase 1: Database Repair Function for Recipe-Template Links
-- This function will repair broken recipe-template associations

CREATE OR REPLACE FUNCTION public.repair_recipe_template_links()
RETURNS TABLE(
  action_type TEXT,
  product_name TEXT,
  template_name TEXT,
  recipe_id UUID,
  template_id UUID,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  -- Step 1: Link existing recipes to templates where names match but template_id is NULL
  RETURN QUERY
  WITH recipe_template_matches AS (
    SELECT DISTINCT ON (r.id)
      r.id as recipe_id,
      r.name as recipe_name,
      rt.id as template_id,
      rt.name as template_name
    FROM recipes r
    LEFT JOIN recipe_templates rt ON LOWER(TRIM(r.name)) = LOWER(TRIM(rt.name))
    WHERE r.template_id IS NULL 
      AND rt.id IS NOT NULL
      AND rt.is_active = true
    ORDER BY r.id, 
      CASE 
        WHEN LOWER(TRIM(r.name)) = LOWER(TRIM(rt.name)) THEN 1
        ELSE 2
      END
  ),
  recipe_updates AS (
    UPDATE recipes 
    SET template_id = rtm.template_id,
        updated_at = NOW()
    FROM recipe_template_matches rtm
    WHERE recipes.id = rtm.recipe_id
    RETURNING id, name, template_id
  )
  SELECT 
    'linked_existing_recipe'::TEXT,
    ru.name,
    (SELECT rt.name FROM recipe_templates rt WHERE rt.id = ru.template_id),
    ru.id,
    ru.template_id,
    true,
    NULL::TEXT
  FROM recipe_updates ru;

  -- Step 2: Create missing recipes for products that have matching templates but no recipe
  RETURN QUERY
  WITH missing_recipe_products AS (
    SELECT DISTINCT ON (pc.id)
      pc.id as product_id,
      pc.product_name,
      pc.store_id,
      rt.id as template_id,
      rt.name as template_name
    FROM product_catalog pc
    LEFT JOIN recipes r ON (r.id = pc.recipe_id AND r.is_active = true)
    LEFT JOIN recipe_templates rt ON LOWER(TRIM(pc.product_name)) = LOWER(TRIM(rt.name))
    WHERE (pc.recipe_id IS NULL OR r.id IS NULL)
      AND rt.id IS NOT NULL
      AND rt.is_active = true
      AND pc.is_available = true
    ORDER BY pc.id,
      CASE 
        WHEN LOWER(TRIM(pc.product_name)) = LOWER(TRIM(rt.name)) THEN 1
        ELSE 2
      END
  ),
  new_recipes AS (
    INSERT INTO recipes (
      name, 
      store_id, 
      template_id, 
      is_active, 
      serving_size, 
      total_cost, 
      cost_per_serving,
      instructions
    )
    SELECT 
      mrp.product_name,
      mrp.store_id,
      mrp.template_id,
      true,
      1,
      0,
      0,
      'Auto-generated recipe from template: ' || mrp.template_name
    FROM missing_recipe_products mrp
    RETURNING id, name, template_id, store_id
  ),
  catalog_updates AS (
    UPDATE product_catalog 
    SET recipe_id = nr.id,
        updated_at = NOW()
    FROM new_recipes nr
    WHERE product_catalog.product_name = nr.name 
      AND product_catalog.store_id = nr.store_id
      AND product_catalog.recipe_id IS NULL
    RETURNING product_catalog.id, product_catalog.product_name, recipe_id
  )
  SELECT 
    'created_missing_recipe'::TEXT,
    nr.name,
    (SELECT rt.name FROM recipe_templates rt WHERE rt.id = nr.template_id),
    nr.id,
    nr.template_id,
    true,
    NULL::TEXT
  FROM new_recipes nr;

  -- Step 3: Create basic templates for products that have no matching templates
  RETURN QUERY
  WITH orphaned_products AS (
    SELECT DISTINCT ON (pc.product_name)
      pc.id as product_id,
      pc.product_name,
      pc.store_id,
      pc.price
    FROM product_catalog pc
    LEFT JOIN recipes r ON (r.id = pc.recipe_id AND r.is_active = true)
    WHERE (pc.recipe_id IS NULL OR r.id IS NULL)
      AND pc.is_available = true
      AND NOT EXISTS (
        SELECT 1 FROM recipe_templates rt 
        WHERE LOWER(TRIM(rt.name)) = LOWER(TRIM(pc.product_name))
          AND rt.is_active = true
      )
    LIMIT 20 -- Limit to prevent overwhelming the system
  ),
  new_templates AS (
    INSERT INTO recipe_templates (
      name,
      category_name,
      description,
      instructions,
      serving_size,
      is_active,
      created_by
    )
    SELECT 
      op.product_name,
      'Auto-Generated',
      'Auto-generated template for ' || op.product_name,
      'Basic auto-generated recipe. Please update with proper ingredients and instructions.',
      1,
      true,
      (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1)
    FROM orphaned_products op
    RETURNING id, name
  ),
  orphaned_recipes AS (
    INSERT INTO recipes (
      name, 
      store_id, 
      template_id, 
      is_active, 
      serving_size, 
      total_cost, 
      cost_per_serving,
      instructions
    )
    SELECT 
      nt.name,
      op.store_id,
      nt.id,
      true,
      1,
      0,
      0,
      'Auto-generated recipe. Please add proper ingredients.'
    FROM new_templates nt
    JOIN orphaned_products op ON op.product_name = nt.name
    RETURNING id, name, template_id, store_id
  ),
  final_catalog_updates AS (
    UPDATE product_catalog 
    SET recipe_id = orec.id,
        updated_at = NOW()
    FROM orphaned_recipes orec
    WHERE product_catalog.product_name = orec.name 
      AND product_catalog.store_id = orec.store_id
      AND product_catalog.recipe_id IS NULL
    RETURNING product_catalog.id, product_catalog.product_name, recipe_id
  )
  SELECT 
    'created_basic_template'::TEXT,
    nt.name,
    nt.name,
    orec.id,
    orec.template_id,
    true,
    'Basic template created - needs ingredients'::TEXT
  FROM new_templates nt
  JOIN orphaned_recipes orec ON orec.template_id = nt.id;

END;
$$;

-- Function to get repair status/summary
CREATE OR REPLACE FUNCTION public.get_recipe_repair_status()
RETURNS TABLE(
  total_products INTEGER,
  products_with_recipes INTEGER,
  products_missing_recipes INTEGER,
  recipes_with_templates INTEGER,
  recipes_missing_templates INTEGER,
  orphaned_products INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM product_catalog WHERE is_available = true) as total_products,
    (SELECT COUNT(*)::INTEGER FROM product_catalog pc 
     JOIN recipes r ON r.id = pc.recipe_id 
     WHERE pc.is_available = true AND r.is_active = true) as products_with_recipes,
    (SELECT COUNT(*)::INTEGER FROM product_catalog pc 
     LEFT JOIN recipes r ON r.id = pc.recipe_id 
     WHERE pc.is_available = true AND (pc.recipe_id IS NULL OR r.id IS NULL)) as products_missing_recipes,
    (SELECT COUNT(*)::INTEGER FROM recipes r 
     JOIN recipe_templates rt ON rt.id = r.template_id 
     WHERE r.is_active = true AND rt.is_active = true) as recipes_with_templates,
    (SELECT COUNT(*)::INTEGER FROM recipes r 
     LEFT JOIN recipe_templates rt ON rt.id = r.template_id 
     WHERE r.is_active = true AND (r.template_id IS NULL OR rt.id IS NULL)) as recipes_missing_templates,
    (SELECT COUNT(*)::INTEGER FROM product_catalog pc
     LEFT JOIN recipes r ON r.id = pc.recipe_id
     WHERE pc.is_available = true 
       AND (pc.recipe_id IS NULL OR r.id IS NULL)
       AND NOT EXISTS (
         SELECT 1 FROM recipe_templates rt 
         WHERE LOWER(TRIM(rt.name)) = LOWER(TRIM(pc.product_name)) 
           AND rt.is_active = true
       )) as orphaned_products;
END;
$$;