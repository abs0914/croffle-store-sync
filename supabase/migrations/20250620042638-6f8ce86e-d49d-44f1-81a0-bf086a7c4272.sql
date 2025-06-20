
-- Create table for product catalog variations (size and temperature)
CREATE TABLE IF NOT EXISTS public.product_catalog_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_catalog_id UUID NOT NULL REFERENCES public.product_catalog(id) ON DELETE CASCADE,
  variation_type TEXT NOT NULL CHECK (variation_type IN ('size', 'temperature')),
  name TEXT NOT NULL,
  price_modifier NUMERIC NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for add-on items
CREATE TABLE IF NOT EXISTS public.product_addon_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('classic_topping', 'classic_sauce', 'premium_topping', 'premium_sauce', 'biscuits')),
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for combo rules and pricing
CREATE TABLE IF NOT EXISTS public.product_combo_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  base_item_category TEXT NOT NULL,
  combo_item_category TEXT NOT NULL,
  combo_price NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_catalog_variations_product_id ON public.product_catalog_variations(product_catalog_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_variations_type ON public.product_catalog_variations(variation_type);
CREATE INDEX IF NOT EXISTS idx_product_addon_items_category ON public.product_addon_items(category);

-- Insert default size variations for croffles
INSERT INTO public.product_catalog_variations (variation_type, name, price_modifier, is_default, display_order, product_catalog_id)
SELECT 
  'size',
  variation_data.name,
  variation_data.price_modifier,
  variation_data.is_default,
  variation_data.display_order,
  pc.id
FROM public.product_catalog pc
CROSS JOIN (
  VALUES 
    ('Mini', -60, false, 1),
    ('Regular', 0, true, 2), 
    ('Overload', -26, false, 3)
) AS variation_data(name, price_modifier, is_default, display_order)
WHERE pc.product_name LIKE '%Croffle%'
  AND NOT EXISTS (
    SELECT 1 FROM public.product_catalog_variations pcv 
    WHERE pcv.product_catalog_id = pc.id AND pcv.variation_type = 'size'
  );

-- Insert temperature variations for drinks
INSERT INTO public.product_catalog_variations (variation_type, name, price_modifier, is_default, display_order, product_catalog_id)
SELECT 
  'temperature',
  variation_data.name,
  variation_data.price_modifier,
  variation_data.is_default,
  variation_data.display_order,
  pc.id
FROM public.product_catalog pc
CROSS JOIN (
  VALUES 
    ('Hot', 0, true, 1),
    ('Iced', 5, false, 2)
) AS variation_data(name, price_modifier, is_default, display_order)
WHERE (pc.product_name LIKE '%Coffee%' OR pc.product_name LIKE '%Latte%' OR pc.product_name LIKE '%Cappuccino%' OR pc.product_name LIKE '%Americano%' OR pc.product_name LIKE '%Mocha%')
  AND NOT EXISTS (
    SELECT 1 FROM public.product_catalog_variations pcv 
    WHERE pcv.product_catalog_id = pc.id AND pcv.variation_type = 'temperature'
  );

-- Insert add-on items with exact pricing
INSERT INTO public.product_addon_items (name, category, price, display_order) VALUES
-- Classic Toppings (₱6)
('Colored Sprinkles', 'classic_topping', 6, 1),
('Marshmallow', 'classic_topping', 6, 2),
('Chocolate Flakes', 'classic_topping', 6, 3),
('Peanuts', 'classic_topping', 6, 4),

-- Classic Sauces (₱6)
('Caramel Sauce', 'classic_sauce', 6, 1),
('Chocolate Sauce', 'classic_sauce', 6, 2),
('Tiramisu Sauce', 'classic_sauce', 6, 3),

-- Premium Toppings (₱10)
('Biscoff Topping', 'premium_topping', 10, 1),
('Oreo Topping', 'premium_topping', 10, 2),
('Strawberry Topping', 'premium_topping', 10, 3),
('Mango Topping', 'premium_topping', 10, 4),
('Blueberry Topping', 'premium_topping', 10, 5),
('Nutella Topping', 'premium_topping', 10, 6),

-- Premium Sauces (₱8)
('Nutella Sauce', 'premium_sauce', 8, 1),
('Dark Chocolate Sauce', 'premium_sauce', 8, 2),

-- Biscuits (₱10)
('Biscoff Biscuit', 'biscuits', 10, 1),
('Oreo Biscuit', 'biscuits', 10, 2),
('Kitkat Biscuit', 'biscuits', 10, 3)
ON CONFLICT DO NOTHING;

-- Insert combo rules
INSERT INTO public.product_combo_rules (name, base_item_category, combo_item_category, combo_price, discount_amount) VALUES
('Mini Croffle + Any Hot Espresso', 'croffles', 'hot_drinks', 110, 15),
('Mini Croffle + Any Iced Espresso', 'croffles', 'iced_drinks', 115, 15),
('Glaze Croffle + Any Hot Espresso', 'croffles', 'hot_drinks', 125, 19),
('Glaze Croffle + Any Iced Espresso', 'croffles', 'iced_drinks', 130, 19),
('Regular Croffle + Any Hot Espresso', 'croffles', 'hot_drinks', 170, 20),
('Regular Croffle + Any Iced Espresso', 'croffles', 'iced_drinks', 175, 20)
ON CONFLICT DO NOTHING;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_catalog_variations_updated_at 
    BEFORE UPDATE ON public.product_catalog_variations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_addon_items_updated_at 
    BEFORE UPDATE ON public.product_addon_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_combo_rules_updated_at 
    BEFORE UPDATE ON public.product_combo_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
