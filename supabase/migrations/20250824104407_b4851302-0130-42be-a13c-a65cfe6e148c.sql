-- Step 1: Add missing updated_at column to recipe_ingredients
ALTER TABLE public.recipe_ingredients 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_recipe_ingredients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recipe_ingredients_updated_at
  BEFORE UPDATE ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_recipe_ingredients_updated_at();

-- Step 2: Create recipe_ingredient_mappings table
CREATE TABLE IF NOT EXISTS public.recipe_ingredient_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  inventory_stock_id UUID NOT NULL REFERENCES public.inventory_stock(id) ON DELETE CASCADE,
  conversion_factor NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, ingredient_name)
);

-- Add RLS policies for recipe_ingredient_mappings
ALTER TABLE public.recipe_ingredient_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mappings for accessible stores" ON public.recipe_ingredient_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN app_users au ON (au.user_id = auth.uid() AND (
        au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) OR 
        r.store_id = ANY(au.store_ids)
      ))
      WHERE r.id = recipe_ingredient_mappings.recipe_id
    )
  );

CREATE POLICY "Managers and above can manage mappings" ON public.recipe_ingredient_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN app_users au ON (au.user_id = auth.uid() AND (
        au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role, 'manager'::app_role]) AND
        (au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) OR r.store_id = ANY(au.store_ids))
      ))
      WHERE r.id = recipe_ingredient_mappings.recipe_id
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_recipe_ingredient_mappings_updated_at
  BEFORE UPDATE ON public.recipe_ingredient_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_recipe_ingredients_updated_at();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_mappings_recipe_id ON public.recipe_ingredient_mappings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_mappings_inventory_stock_id ON public.recipe_ingredient_mappings(inventory_stock_id);