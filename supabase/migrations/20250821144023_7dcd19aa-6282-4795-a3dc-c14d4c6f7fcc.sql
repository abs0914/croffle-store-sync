-- Fix RLS policies for cross-system recipe management

-- Update recipe_ingredients table RLS to allow proper editing of legacy recipes
DROP POLICY IF EXISTS "Users can manage recipe ingredients for accessible stores" ON recipe_ingredients;

CREATE POLICY "Users can manage recipe ingredients for accessible stores"
ON recipe_ingredients FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipes r
    WHERE r.id = recipe_ingredients.recipe_id
    AND (
      is_admin_or_owner() 
      OR is_store_accessible(r.store_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM recipes r
    WHERE r.id = recipe_ingredients.recipe_id
    AND (
      is_admin_or_owner() 
      OR is_store_accessible(r.store_id)
    )
  )
);

-- Ensure recipe_ingredients table has proper RLS enabled
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Update recipes table RLS to ensure proper access
DROP POLICY IF EXISTS "Users can manage recipes for accessible stores" ON recipes;

CREATE POLICY "Users can manage recipes for accessible stores"
ON recipes FOR ALL
USING (
  is_admin_or_owner() 
  OR is_store_accessible(store_id)
)
WITH CHECK (
  is_admin_or_owner() 
  OR is_store_accessible(store_id)
);

-- Ensure recipes table has proper RLS enabled
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Add helpful comment about the fix
COMMENT ON POLICY "Users can manage recipe ingredients for accessible stores" ON recipe_ingredients IS 
'Allows users to manage recipe ingredients for legacy and unified recipes in stores they have access to';

COMMENT ON POLICY "Users can manage recipes for accessible stores" ON recipes IS 
'Allows users to manage legacy recipes in stores they have access to';