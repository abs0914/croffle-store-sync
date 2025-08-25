-- Create the recipe ingredient categories table
CREATE TABLE IF NOT EXISTS recipe_ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_category TEXT NOT NULL,
  ingredient_category inventory_item_category NOT NULL,
  required_ingredients TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standard ingredient requirements by product category
INSERT INTO recipe_ingredient_categories (product_category, ingredient_category, required_ingredients) VALUES
-- Croffle requirements
('croffle', 'base_ingredient', ARRAY['REGULAR CROISSANT']),
('croffle', 'classic_topping', ARRAY['Whipped Cream']),
('croffle', 'premium_topping', ARRAY['Crushed Graham', 'Dark Chocolate', 'Tiramisu']),
('croffle', 'packaging', ARRAY['Wax Paper', 'Chopstick']),

-- Coffee requirements  
('coffee', 'base_ingredient', ARRAY['Coffee Beans', 'Milk']),
('coffee', 'packaging', ARRAY['Coffee Cup', 'Cup Lid']),

-- Beverage requirements
('beverage', 'base_ingredient', ARRAY['Water', 'Syrup']),
('beverage', 'packaging', ARRAY['Cup', 'Straw', 'Cup Lid']),

-- Default packaging for all products
('default', 'packaging', ARRAY['Napkin', 'Takeout Bag']);