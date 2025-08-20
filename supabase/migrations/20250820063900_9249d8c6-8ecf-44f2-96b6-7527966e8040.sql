-- Fix ingredient name mismatches for Choco Marshmallow Croffle recipe
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Marshmallow'
WHERE ingredient_name = 'Marshmallow Toppings' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name ILIKE '%choco%marshmallow%'
);

-- Fix unit mismatches for chopsticks
UPDATE recipe_template_ingredients 
SET unit = 'pieces'
WHERE ingredient_name = 'Chopstick' 
AND unit = 'pair'
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name ILIKE '%choco%marshmallow%'
);

-- Update quantity for chopsticks (pair -> pieces conversion: 1 pair = 2 pieces)
UPDATE recipe_template_ingredients 
SET quantity = quantity * 2
WHERE ingredient_name = 'Chopstick' 
AND unit = 'pieces'
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name ILIKE '%choco%marshmallow%'
);

-- Create unit conversion mappings table for future use
CREATE TABLE IF NOT EXISTS unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  conversion_factor NUMERIC NOT NULL,
  ingredient_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standard unit conversions
INSERT INTO unit_conversions (from_unit, to_unit, conversion_factor, ingredient_type) VALUES
('pair', 'pieces', 2, 'utensils'),
('pieces', 'pair', 0.5, 'utensils'),
('portion', 'serving', 1, 'general'),
('serving', 'portion', 1, 'general'),
('ml', 'portion', 0.02, 'liquids'),
('grams', 'portion', 0.02, 'sauces')
ON CONFLICT DO NOTHING;

-- Enable RLS on unit_conversions
ALTER TABLE unit_conversions ENABLE ROW LEVEL SECURITY;

-- Create policy for unit_conversions
CREATE POLICY "All authenticated users can read unit conversions"
ON unit_conversions FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage unit conversions"
ON unit_conversions FOR ALL
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());