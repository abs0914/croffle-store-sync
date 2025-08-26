-- Fix critical security issue: Enable RLS on unified recipe tables
-- This is required for production security

-- Enable RLS on unified_recipes table
ALTER TABLE unified_recipes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on unified_recipe_ingredients table  
ALTER TABLE unified_recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for unified_recipes
CREATE POLICY "Users can view recipes for their stores" 
ON unified_recipes FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR unified_recipes.store_id = ANY(au.store_ids)
    )
  )
);

CREATE POLICY "Users can manage recipes for their stores" 
ON unified_recipes FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR unified_recipes.store_id = ANY(au.store_ids)
    )
  )
);

-- Create basic RLS policies for unified_recipe_ingredients
CREATE POLICY "Users can view ingredients for accessible recipes" 
ON unified_recipe_ingredients FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM unified_recipes ur
    JOIN app_users au ON (
      au.user_id = auth.uid() 
      AND (
        au.role IN ('admin', 'owner') 
        OR ur.store_id = ANY(au.store_ids)
      )
    )
    WHERE ur.id = unified_recipe_ingredients.recipe_id
  )
);

CREATE POLICY "Users can manage ingredients for accessible recipes" 
ON unified_recipe_ingredients FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM unified_recipes ur
    JOIN app_users au ON (
      au.user_id = auth.uid() 
      AND (
        au.role IN ('admin', 'owner') 
        OR ur.store_id = ANY(au.store_ids)
      )
    )
    WHERE ur.id = unified_recipe_ingredients.recipe_id
  )
);