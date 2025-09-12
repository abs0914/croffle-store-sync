-- Fix 1: Add ingredient groups and optional tracking to recipe_ingredients
ALTER TABLE recipe_ingredients 
ADD COLUMN IF NOT EXISTS ingredient_group_name TEXT DEFAULT 'base',
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_selected_addon BOOLEAN DEFAULT false;

-- Comment on the new columns for clarity
COMMENT ON COLUMN recipe_ingredients.ingredient_group_name IS 'Group name for ingredients: base, sauce, topping, packaging, etc.';
COMMENT ON COLUMN recipe_ingredients.is_optional IS 'Whether this ingredient is optional (for Mix & Match choices)';
COMMENT ON COLUMN recipe_ingredients.is_selected_addon IS 'Whether this ingredient represents a selected addon from transaction';

-- Add structured addon metadata to transaction_items
ALTER TABLE transaction_items
ADD COLUMN IF NOT EXISTS selected_addons JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS addon_metadata JSONB DEFAULT '{}'::jsonb;

-- Comment on the new addon columns
COMMENT ON COLUMN transaction_items.selected_addons IS 'Array of selected addon IDs and names for Mix & Match products';
COMMENT ON COLUMN transaction_items.addon_metadata IS 'Additional metadata about addon selections (prices, choices, etc.)';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_group_name ON recipe_ingredients(ingredient_group_name);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_optional ON recipe_ingredients(is_optional);
CREATE INDEX IF NOT EXISTS idx_transaction_items_addons ON transaction_items USING GIN(selected_addons);

-- Update existing Mix & Match recipes to have proper ingredient groups
-- Mark sauce and topping ingredients as optional choices
UPDATE recipe_ingredients 
SET 
  ingredient_group_name = CASE
    WHEN LOWER(ingredient_name) LIKE '%sauce%' OR LOWER(ingredient_name) LIKE '%syrup%' THEN 'sauce'
    WHEN LOWER(ingredient_name) LIKE '%topping%' OR LOWER(ingredient_name) LIKE '%sprinkles%' 
         OR LOWER(ingredient_name) LIKE '%marshmallow%' OR LOWER(ingredient_name) LIKE '%choco%' 
         OR LOWER(ingredient_name) LIKE '%tiramisu%' THEN 'topping'
    WHEN LOWER(ingredient_name) LIKE '%cup%' OR LOWER(ingredient_name) LIKE '%container%' 
         OR LOWER(ingredient_name) LIKE '%packaging%' THEN 'packaging'
    ELSE 'base'
  END,
  is_optional = CASE
    WHEN LOWER(ingredient_name) LIKE '%sauce%' OR LOWER(ingredient_name) LIKE '%syrup%' 
         OR LOWER(ingredient_name) LIKE '%topping%' OR LOWER(ingredient_name) LIKE '%sprinkles%' 
         OR LOWER(ingredient_name) LIKE '%marshmallow%' OR LOWER(ingredient_name) LIKE '%choco%' 
         OR LOWER(ingredient_name) LIKE '%tiramisu%' THEN true
    ELSE false
  END
WHERE recipe_id IN (
  SELECT r.id FROM recipes r
  WHERE LOWER(r.name) LIKE '%croffle overload%' OR LOWER(r.name) LIKE '%mini croffle%'
);