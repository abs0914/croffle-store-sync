
-- Add store inventory support to recipe template ingredients
ALTER TABLE recipe_template_ingredients 
ADD COLUMN IF NOT EXISTS inventory_stock_id uuid REFERENCES inventory_stock(id),
ADD COLUMN IF NOT EXISTS store_unit text,
ADD COLUMN IF NOT EXISTS recipe_to_store_conversion_factor numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS uses_store_inventory boolean DEFAULT false;

-- Update the recipe_template_ingredients table to support both commissary and store inventory
COMMENT ON COLUMN recipe_template_ingredients.inventory_stock_id IS 'References store inventory item when uses_store_inventory is true';
COMMENT ON COLUMN recipe_template_ingredients.store_unit IS 'Unit of measure in store inventory (e.g., pack, box)';
COMMENT ON COLUMN recipe_template_ingredients.recipe_to_store_conversion_factor IS 'How many recipe units in one store unit (e.g., 20 pieces per pack)';
COMMENT ON COLUMN recipe_template_ingredients.uses_store_inventory IS 'Whether this ingredient uses store inventory (true) or commissary inventory (false)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_recipe_template_ingredients_inventory_stock 
ON recipe_template_ingredients(inventory_stock_id);

-- Update existing records to default to commissary inventory
UPDATE recipe_template_ingredients 
SET uses_store_inventory = false 
WHERE uses_store_inventory IS NULL;

-- Make uses_store_inventory NOT NULL with default
ALTER TABLE recipe_template_ingredients 
ALTER COLUMN uses_store_inventory SET NOT NULL,
ALTER COLUMN uses_store_inventory SET DEFAULT false;
