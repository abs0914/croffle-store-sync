-- Create ingredient groups table for organizing recipe ingredients
CREATE TABLE IF NOT EXISTS recipe_ingredient_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_template_id UUID NOT NULL REFERENCES recipe_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  selection_type TEXT NOT NULL DEFAULT 'required_one' CHECK (selection_type IN ('required_one', 'optional_one', 'multiple', 'required_all')),
  min_selections INTEGER DEFAULT 1,
  max_selections INTEGER,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pricing matrix table for complex pricing rules
CREATE TABLE IF NOT EXISTS recipe_pricing_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_template_id UUID NOT NULL REFERENCES recipe_templates(id) ON DELETE CASCADE,
  size_category TEXT, -- 'mini', 'regular', 'overload'
  temperature_category TEXT, -- 'hot', 'ice', 'room_temp'
  base_price NUMERIC NOT NULL DEFAULT 0,
  price_modifier NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_template_id, size_category, temperature_category)
);

-- Create addon categories table
CREATE TABLE IF NOT EXISTS addon_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category_type TEXT NOT NULL DEFAULT 'topping' CHECK (category_type IN ('topping', 'sauce', 'extra', 'biscuit', 'packaging')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update product_addon_items to reference addon_categories
ALTER TABLE product_addon_items 
ADD COLUMN IF NOT EXISTS addon_category_id UUID REFERENCES addon_categories(id),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Create combo pricing rules table for advanced combinations
CREATE TABLE IF NOT EXISTS combo_pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  base_category TEXT NOT NULL, -- 'mini_croffle', 'regular_croffle', 'glaze_croffle'
  combo_category TEXT NOT NULL, -- 'hot_espresso', 'ice_espresso'
  combo_price NUMERIC NOT NULL,
  discount_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER DEFAULT 0, -- For rule precedence
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(base_category, combo_category)
);

-- Insert default addon categories
INSERT INTO addon_categories (name, category_type, display_order) VALUES
('Classic Toppings', 'topping', 1),
('Classic Sauces', 'sauce', 2),
('Premium Toppings', 'topping', 3),
('Premium Sauces', 'sauce', 4),
('Biscuits', 'biscuit', 5),
('Packaging', 'packaging', 6)
ON CONFLICT (name) DO NOTHING;

-- Insert sample combo pricing rules based on your table
INSERT INTO combo_pricing_rules (name, base_category, combo_category, combo_price) VALUES
('Mini Croffle + Hot Espresso', 'mini_croffle', 'hot_espresso', 110),
('Mini Croffle + Ice Espresso', 'mini_croffle', 'ice_espresso', 115),
('Glaze Croffle + Hot Espresso', 'glaze_croffle', 'hot_espresso', 125),
('Glaze Croffle + Ice Espresso', 'glaze_croffle', 'ice_espresso', 130),
('Regular Croffle + Hot Espresso', 'regular_croffle', 'hot_espresso', 170),
('Regular Croffle + Ice Espresso', 'regular_croffle', 'ice_espresso', 175)
ON CONFLICT (base_category, combo_category) DO NOTHING;

-- Insert sample addon items based on your list
INSERT INTO product_addon_items (name, category, price, is_available, display_order, is_premium) VALUES
('Colored Sprinkles', 'classic_topping', 6, true, 1, false),
('Marshmallow', 'classic_topping', 6, true, 2, false),
('Chocolate Flakes', 'classic_topping', 6, true, 3, false),
('Peanuts', 'classic_topping', 6, true, 4, false),
('Caramel', 'classic_sauce', 6, true, 5, false),
('Chocolate', 'classic_sauce', 6, true, 6, false),
('Tiramisu', 'classic_topping', 6, true, 7, false),
('Biscoff', 'premium_topping', 10, true, 8, true),
('Oreo', 'premium_topping', 10, true, 9, true),
('Strawberry', 'premium_topping', 10, true, 10, true),
('Mango', 'premium_topping', 10, true, 11, true),
('Blueberry', 'premium_topping', 10, true, 12, true),
('Nutella (Premium Topping)', 'premium_topping', 10, true, 13, true),
('Nutella (Premium Sauce)', 'premium_sauce', 8, true, 14, true),
('Dark Chocolate', 'premium_sauce', 8, true, 15, true),
('Biscoff Biscuit', 'biscuits', 10, true, 16, true),
('Oreo Biscuit', 'biscuits', 10, true, 17, true),
('KitKat', 'biscuits', 10, true, 18, true),
('Rectangle', 'classic_topping', 2.6, true, 19, false),
('Take-out box w/ cover', 'classic_topping', 5.6, true, 20, false),
('Mini Take Out Box', 'classic_topping', 2.4, true, 21, false),
('Paper Bag #06', 'classic_topping', 0.81, true, 22, false),
('Paper Bag #20', 'classic_topping', 1.86, true, 23, false),
('Overload Cup', 'classic_topping', 8, true, 24, false)
ON CONFLICT DO NOTHING;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_groups_template_id ON recipe_ingredient_groups(recipe_template_id);
CREATE INDEX IF NOT EXISTS idx_recipe_pricing_matrix_template_id ON recipe_pricing_matrix(recipe_template_id);
CREATE INDEX IF NOT EXISTS idx_combo_pricing_rules_categories ON combo_pricing_rules(base_category, combo_category);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipe_ingredient_groups_updated_at 
    BEFORE UPDATE ON recipe_ingredient_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_pricing_matrix_updated_at 
    BEFORE UPDATE ON recipe_pricing_matrix 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addon_categories_updated_at 
    BEFORE UPDATE ON addon_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_combo_pricing_rules_updated_at 
    BEFORE UPDATE ON combo_pricing_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();