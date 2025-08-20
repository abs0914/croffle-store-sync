-- Phase 1: Fix Category Assignments for Inventory Items

-- Update syrups to classic_sauce category
UPDATE inventory_stock 
SET item_category = 'classic_sauce'
WHERE item_category = 'base_ingredient' 
AND (item ILIKE '%syrup%' OR item ILIKE '%sauce%')
AND item NOT IN ('Vanilla Ice Cream', 'Whipped Cream', 'Creamer');

-- Update chocolate items to premium_topping category
UPDATE inventory_stock 
SET item_category = 'premium_topping'
WHERE item_category = 'base_ingredient' 
AND (item ILIKE '%chocolate%' AND item NOT ILIKE '%sauce%')
AND item NOT IN ('Chocolate Sauce');

-- Update marshmallow to premium_topping category
UPDATE inventory_stock 
SET item_category = 'premium_topping'
WHERE item_category = 'base_ingredient' 
AND (item ILIKE '%marshmallow%');

-- Update ice cream and whipped cream to premium_topping category
UPDATE inventory_stock 
SET item_category = 'premium_topping'
WHERE item_category = 'base_ingredient' 
AND (item ILIKE '%ice cream%' OR item ILIKE '%whipped cream%');

-- Create ingredient category mapping table for recipe validation
CREATE TABLE IF NOT EXISTS ingredient_category_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_pattern text NOT NULL,
  expected_categories text[] NOT NULL,
  priority integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert category mapping rules
INSERT INTO ingredient_category_mappings (ingredient_pattern, expected_categories, priority) VALUES
  ('syrup', ARRAY['classic_sauce', 'premium_sauce'], 10),
  ('sauce', ARRAY['classic_sauce', 'premium_sauce'], 10),
  ('chocolate', ARRAY['premium_topping', 'classic_topping'], 9),
  ('marshmallow', ARRAY['premium_topping', 'classic_topping'], 9),
  ('ice cream', ARRAY['premium_topping'], 9),
  ('whipped cream', ARRAY['premium_topping'], 9),
  ('cream', ARRAY['premium_topping', 'base_ingredient'], 8),
  ('topping', ARRAY['classic_topping', 'premium_topping'], 8),
  ('crumble', ARRAY['classic_topping', 'premium_topping'], 7),
  ('flakes', ARRAY['classic_topping', 'premium_topping'], 7),
  ('powder', ARRAY['base_ingredient'], 6),
  ('milk', ARRAY['base_ingredient'], 6),
  ('coffee', ARRAY['base_ingredient'], 6),
  ('water', ARRAY['base_ingredient'], 6),
  ('sugar', ARRAY['base_ingredient'], 6),
  ('croissant', ARRAY['biscuit'], 10),
  ('waffle', ARRAY['biscuit'], 10),
  ('bread', ARRAY['biscuit'], 10),
  ('cup', ARRAY['packaging'], 10),
  ('lid', ARRAY['packaging'], 10),
  ('straw', ARRAY['packaging'], 10),
  ('napkin', ARRAY['packaging'], 10),
  ('bag', ARRAY['packaging'], 10);

-- Enable RLS for ingredient category mappings
ALTER TABLE ingredient_category_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage ingredient category mappings"
ON ingredient_category_mappings
FOR ALL
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

CREATE POLICY "Users can view ingredient category mappings"
ON ingredient_category_mappings
FOR SELECT
USING (auth.role() = 'authenticated');