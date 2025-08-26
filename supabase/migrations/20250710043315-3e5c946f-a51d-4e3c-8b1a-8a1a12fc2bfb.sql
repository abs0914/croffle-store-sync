-- Add missing tables for advanced recipe management

-- Create recipe_ingredient_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.recipe_ingredient_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_template_id UUID NOT NULL REFERENCES public.recipe_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  selection_type TEXT NOT NULL DEFAULT 'required_one' CHECK (selection_type IN ('required_one', 'optional_one', 'multiple', 'required_all')),
  min_selections INTEGER NOT NULL DEFAULT 1,
  max_selections INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipe_pricing_matrix table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.recipe_pricing_matrix (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_template_id UUID NOT NULL REFERENCES public.recipe_templates(id) ON DELETE CASCADE,
  size_category TEXT,
  temperature_category TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  price_modifier NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_template_id, size_category, temperature_category)
);

-- Create product_addon_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.product_addon_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_category_id UUID NOT NULL REFERENCES public.addon_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add "Add-ons" category to categories table for each store
INSERT INTO public.categories (name, description, store_id, is_active)
SELECT 
  'Add-ons' as name,
  'Add-on items and extras' as description,
  stores.id as store_id,
  true as is_active
FROM public.stores
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE categories.name = 'Add-ons' AND categories.store_id = stores.id
);

-- Add some sample addon items
INSERT INTO public.product_addon_items (addon_category_id, name, price, is_premium, display_order) VALUES
((SELECT id FROM public.addon_categories WHERE name = 'Classic Toppings' LIMIT 1), 'Sprinkles', 6.00, false, 1),
((SELECT id FROM public.addon_categories WHERE name = 'Classic Toppings' LIMIT 1), 'Chocolate Chips', 8.00, false, 2),
((SELECT id FROM public.addon_categories WHERE name = 'Premium Toppings' LIMIT 1), 'Nutella', 10.00, true, 1),
((SELECT id FROM public.addon_categories WHERE name = 'Premium Toppings' LIMIT 1), 'Fresh Strawberries', 12.00, true, 2),
((SELECT id FROM public.addon_categories WHERE name = 'Classic Sauces' LIMIT 1), 'Chocolate Syrup', 5.00, false, 1),
((SELECT id FROM public.addon_categories WHERE name = 'Premium Sauces' LIMIT 1), 'Salted Caramel', 8.00, true, 1)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_groups_template ON public.recipe_ingredient_groups(recipe_template_id);
CREATE INDEX IF NOT EXISTS idx_recipe_pricing_matrix_template ON public.recipe_pricing_matrix(recipe_template_id);
CREATE INDEX IF NOT EXISTS idx_product_addon_items_category ON public.product_addon_items(addon_category_id);

-- Add RLS policies
ALTER TABLE public.recipe_ingredient_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_pricing_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addon_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for recipe_ingredient_groups
CREATE POLICY "Admin and owners can manage ingredient groups" ON public.recipe_ingredient_groups
  FOR ALL USING (is_admin_or_owner());

CREATE POLICY "Users can view ingredient groups" ON public.recipe_ingredient_groups
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS policies for recipe_pricing_matrix
CREATE POLICY "Admin and owners can manage pricing matrix" ON public.recipe_pricing_matrix
  FOR ALL USING (is_admin_or_owner());

CREATE POLICY "Users can view pricing matrix" ON public.recipe_pricing_matrix
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS policies for product_addon_items
CREATE POLICY "Admin and owners can manage addon items" ON public.product_addon_items
  FOR ALL USING (is_admin_or_owner());

CREATE POLICY "Users can view addon items" ON public.product_addon_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- Add updated_at triggers
CREATE TRIGGER update_recipe_ingredient_groups_updated_at
  BEFORE UPDATE ON public.recipe_ingredient_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipe_pricing_matrix_updated_at
  BEFORE UPDATE ON public.recipe_pricing_matrix
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_addon_items_updated_at
  BEFORE UPDATE ON public.product_addon_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();