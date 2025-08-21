-- Unified Recipe System Migration: Simplify from templates/individual recipes to single recipe system

-- 1. First, let's see what we have currently and create a simplified unified recipes table
CREATE TABLE IF NOT EXISTS public.unified_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  store_id UUID NOT NULL,
  total_cost NUMERIC DEFAULT 0,
  cost_per_serving NUMERIC DEFAULT 0,
  serving_size INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create unified recipe ingredients table
CREATE TABLE IF NOT EXISTS public.unified_recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.unified_recipes(id) ON DELETE CASCADE,
  inventory_stock_id UUID NOT NULL,
  ingredient_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC NOT NULL CHECK (cost_per_unit >= 0),
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Add RLS policies for unified_recipes
ALTER TABLE public.unified_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipes for their stores" 
ON public.unified_recipes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND (au.role IN ('admin', 'owner') OR unified_recipes.store_id = ANY(au.store_ids))
  )
);

CREATE POLICY "Users can create recipes for their stores" 
ON public.unified_recipes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND (au.role IN ('admin', 'owner') OR unified_recipes.store_id = ANY(au.store_ids))
  )
);

CREATE POLICY "Users can update recipes for their stores" 
ON public.unified_recipes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND (au.role IN ('admin', 'owner') OR unified_recipes.store_id = ANY(au.store_ids))
  )
);

CREATE POLICY "Users can delete recipes for their stores" 
ON public.unified_recipes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND (au.role IN ('admin', 'owner') OR unified_recipes.store_id = ANY(au.store_ids))
  )
);

-- 4. Add RLS policies for unified_recipe_ingredients
ALTER TABLE public.unified_recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage recipe ingredients for their stores" 
ON public.unified_recipe_ingredients 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM unified_recipes ur
    JOIN app_users au ON (au.user_id = auth.uid())
    WHERE ur.id = unified_recipe_ingredients.recipe_id
    AND (au.role IN ('admin', 'owner') OR ur.store_id = ANY(au.store_ids))
  )
);

-- 5. Create trigger to update recipe costs when ingredients change
CREATE OR REPLACE FUNCTION update_unified_recipe_costs()
RETURNS TRIGGER AS $$
BEGIN
  -- Update recipe total cost and cost per serving
  UPDATE unified_recipes SET
    total_cost = (
      SELECT COALESCE(SUM(quantity * cost_per_unit), 0)
      FROM unified_recipe_ingredients
      WHERE recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
    ),
    cost_per_serving = (
      SELECT COALESCE(SUM(quantity * cost_per_unit), 0) / GREATEST(serving_size, 1)
      FROM unified_recipe_ingredients
      WHERE recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_unified_recipe_costs_trigger
AFTER INSERT OR UPDATE OR DELETE ON unified_recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION update_unified_recipe_costs();

-- 6. Create function to get inventory items by category for recipe creation
CREATE OR REPLACE FUNCTION get_inventory_items_by_category(store_id_param UUID)
RETURNS TABLE(
  id UUID,
  item TEXT,
  unit TEXT,
  item_category TEXT,
  stock_quantity INTEGER,
  cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    inv.id,
    inv.item,
    inv.unit,
    inv.item_category::TEXT,
    inv.stock_quantity,
    inv.cost
  FROM inventory_stock inv
  WHERE inv.store_id = store_id_param
    AND inv.is_active = true
  ORDER BY 
    inv.item_category,
    inv.item;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;