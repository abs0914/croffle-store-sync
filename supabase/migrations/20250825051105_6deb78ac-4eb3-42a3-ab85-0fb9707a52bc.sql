-- Fix security issues: Enable RLS and add policies for recipe_ingredient_categories table
ALTER TABLE recipe_ingredient_categories ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for recipe_ingredient_categories
CREATE POLICY "Admins can manage recipe ingredient categories" 
ON recipe_ingredient_categories 
FOR ALL 
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

CREATE POLICY "Users can view recipe ingredient categories" 
ON recipe_ingredient_categories 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);