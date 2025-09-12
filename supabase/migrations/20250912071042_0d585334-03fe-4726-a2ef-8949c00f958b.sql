-- Create recipe_ingredient_mappings table for better cross-store mapping management
CREATE TABLE IF NOT EXISTS public.recipe_ingredient_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  inventory_stock_id UUID NOT NULL REFERENCES public.inventory_stock(id) ON DELETE CASCADE,
  conversion_factor NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, ingredient_name)
);

-- Enable RLS on recipe_ingredient_mappings
ALTER TABLE public.recipe_ingredient_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recipe_ingredient_mappings
CREATE POLICY "Users can view mappings for their accessible recipes" 
ON public.recipe_ingredient_mappings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM recipes r
    JOIN app_users au ON (au.user_id = auth.uid())
    WHERE r.id = recipe_ingredient_mappings.recipe_id
    AND (au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) 
         OR r.store_id = ANY(au.store_ids))
  )
);

CREATE POLICY "Users can manage mappings for their accessible recipes" 
ON public.recipe_ingredient_mappings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM recipes r
    JOIN app_users au ON (au.user_id = auth.uid())
    WHERE r.id = recipe_ingredient_mappings.recipe_id
    AND (au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) 
         OR r.store_id = ANY(au.store_ids))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM recipes r
    JOIN app_users au ON (au.user_id = auth.uid())
    WHERE r.id = recipe_ingredient_mappings.recipe_id
    AND (au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) 
         OR r.store_id = ANY(au.store_ids))
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_mappings_recipe_id ON public.recipe_ingredient_mappings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_mappings_inventory_stock_id ON public.recipe_ingredient_mappings(inventory_stock_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_mappings_ingredient_name ON public.recipe_ingredient_mappings(ingredient_name);

-- Function to detect foreign mapping issues (cross-store inventory references)
CREATE OR REPLACE FUNCTION public.detect_foreign_mappings(p_store_id UUID)
RETURNS TABLE(
  recipe_id UUID,
  recipe_name TEXT,
  ingredient_id UUID,
  ingredient_name TEXT,
  foreign_inventory_id UUID,
  foreign_store_id UUID,
  foreign_store_name TEXT,
  foreign_item_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as recipe_id,
    r.name as recipe_name,
    ri.id as ingredient_id,
    COALESCE(ist.item, 'Unknown Item') as ingredient_name,
    ri.inventory_stock_id as foreign_inventory_id,
    ist.store_id as foreign_store_id,
    s.name as foreign_store_name,
    ist.item as foreign_item_name
  FROM recipes r
  JOIN recipe_ingredients ri ON r.id = ri.recipe_id
  JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
  LEFT JOIN stores s ON ist.store_id = s.id
  WHERE r.store_id = p_store_id
    AND ist.store_id != p_store_id
    AND r.is_active = true
    AND ri.inventory_stock_id IS NOT NULL;
END;
$$;

-- Function to automatically fix foreign mappings by name matching
CREATE OR REPLACE FUNCTION public.fix_foreign_mappings_by_name(p_store_id UUID)
RETURNS TABLE(
  fixed_count INTEGER,
  failed_count INTEGER,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  foreign_mapping RECORD;
  target_inventory RECORD;
  fixed_mappings INTEGER := 0;
  failed_mappings INTEGER := 0;
  operation_details JSONB[] := '{}';
BEGIN
  -- Get all foreign mappings for this store
  FOR foreign_mapping IN 
    SELECT * FROM detect_foreign_mappings(p_store_id)
  LOOP
    -- Try to find matching inventory item in the target store
    SELECT ist.id, ist.item INTO target_inventory
    FROM inventory_stock ist
    WHERE ist.store_id = p_store_id
      AND ist.is_active = true
      AND (
        LOWER(TRIM(ist.item)) = LOWER(TRIM(foreign_mapping.foreign_item_name))
        OR LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(foreign_mapping.foreign_item_name)) || '%'
        OR LOWER(TRIM(foreign_mapping.foreign_item_name)) LIKE '%' || LOWER(TRIM(ist.item)) || '%'
      )
    ORDER BY 
      CASE 
        WHEN LOWER(TRIM(ist.item)) = LOWER(TRIM(foreign_mapping.foreign_item_name)) THEN 1
        ELSE 2
      END
    LIMIT 1;
    
    IF target_inventory.id IS NOT NULL THEN
      -- Update the mapping
      UPDATE recipe_ingredients 
      SET 
        inventory_stock_id = target_inventory.id,
        updated_at = NOW()
      WHERE id = foreign_mapping.ingredient_id;
      
      fixed_mappings := fixed_mappings + 1;
      operation_details := operation_details || jsonb_build_object(
        'recipe_name', foreign_mapping.recipe_name,
        'ingredient_name', foreign_mapping.ingredient_name,
        'old_item', foreign_mapping.foreign_item_name,
        'new_item', target_inventory.item,
        'status', 'fixed'
      );
    ELSE
      failed_mappings := failed_mappings + 1;
      operation_details := operation_details || jsonb_build_object(
        'recipe_name', foreign_mapping.recipe_name,
        'ingredient_name', foreign_mapping.ingredient_name,
        'foreign_item', foreign_mapping.foreign_item_name,
        'status', 'no_match_found'
      );
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT 
    fixed_mappings,
    failed_mappings,
    jsonb_build_object(
      'operations', operation_details,
      'summary', jsonb_build_object(
        'total_processed', fixed_mappings + failed_mappings,
        'successfully_fixed', fixed_mappings,
        'failed_to_fix', failed_mappings
      )
    );
END;
$$;

-- View to easily see cross-store mapping issues
CREATE OR REPLACE VIEW public.cross_store_mapping_issues AS
SELECT 
  r.store_id as recipe_store_id,
  s1.name as recipe_store_name,
  r.id as recipe_id,
  r.name as recipe_name,
  ri.id as ingredient_id,
  COALESCE(ist.item, 'Unknown Item') as ingredient_name,
  ri.inventory_stock_id,
  ist.store_id as inventory_store_id,
  s2.name as inventory_store_name,
  ist.item as inventory_item_name,
  'cross_store_mapping' as issue_type
FROM recipes r
JOIN stores s1 ON r.store_id = s1.id
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
JOIN stores s2 ON ist.store_id = s2.id
WHERE r.store_id != ist.store_id
  AND r.is_active = true
  AND ri.inventory_stock_id IS NOT NULL;

-- Trigger to auto-update updated_at on recipe_ingredient_mappings
CREATE OR REPLACE FUNCTION public.update_recipe_ingredient_mappings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_recipe_ingredient_mappings_updated_at
  BEFORE UPDATE ON public.recipe_ingredient_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_recipe_ingredient_mappings_updated_at();