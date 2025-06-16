
-- Create commissary_inventory table for raw materials/ingredients
CREATE TABLE public.commissary_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('raw_materials', 'packaging_materials', 'supplies')),
  current_stock NUMERIC NOT NULL DEFAULT 0,
  minimum_threshold NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs', 'serving', 'portion', 'scoop', 'pair')),
  unit_cost NUMERIC,
  supplier_id UUID,
  sku TEXT,
  barcode TEXT,
  expiry_date DATE,
  storage_location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for commissary_inventory
ALTER TABLE public.commissary_inventory ENABLE ROW LEVEL SECURITY;

-- Admin/Owner can do everything
CREATE POLICY "Admin and owners can manage commissary inventory" 
  ON public.commissary_inventory 
  FOR ALL 
  USING (is_admin_or_owner());

-- Update the existing recipes table to support better recipe management
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS serving_size NUMERIC DEFAULT 1;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS cost_per_serving NUMERIC DEFAULT 0;

-- Update recipe_ingredients to reference commissary_inventory
ALTER TABLE public.recipe_ingredients ADD COLUMN IF NOT EXISTS commissary_item_id UUID;
ALTER TABLE public.recipe_ingredients ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC;

-- Add foreign key constraint for commissary items
ALTER TABLE public.recipe_ingredients 
ADD CONSTRAINT fk_recipe_ingredients_commissary_item 
FOREIGN KEY (commissary_item_id) REFERENCES public.commissary_inventory(id);

-- Create trigger to update recipe costs when ingredients change
CREATE OR REPLACE FUNCTION calculate_recipe_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the total cost of the recipe
  UPDATE recipes 
  SET total_cost = (
    SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, ci.unit_cost, 0)), 0)
    FROM recipe_ingredients ri
    LEFT JOIN commissary_inventory ci ON ri.commissary_item_id = ci.id
    WHERE ri.recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
  ),
  cost_per_serving = (
    SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, ci.unit_cost, 0)), 0) / GREATEST(yield_quantity, 1)
    FROM recipe_ingredients ri
    LEFT JOIN commissary_inventory ci ON ri.commissary_item_id = ci.id
    WHERE ri.recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
  )
  WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for recipe cost calculation
DROP TRIGGER IF EXISTS recipe_cost_update_trigger ON recipe_ingredients;
CREATE TRIGGER recipe_cost_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION calculate_recipe_cost();
