-- Add missing columns to products table for proper inventory integration
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'recipe' CHECK (product_type IN ('recipe', 'direct')),
ADD COLUMN IF NOT EXISTS inventory_stock_id UUID REFERENCES inventory_stock(id),
ADD COLUMN IF NOT EXISTS recipe_id UUID,
ADD COLUMN IF NOT EXISTS selling_quantity NUMERIC DEFAULT 1;

-- Update existing products to have proper product_type based on SKU patterns
UPDATE products 
SET product_type = CASE 
    WHEN sku LIKE 'RCP-%' OR description LIKE 'Recipe for%' THEN 'recipe'
    ELSE 'direct'
END
WHERE product_type IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_inventory_stock ON products(inventory_stock_id);
CREATE INDEX IF NOT EXISTS idx_products_recipe ON products(recipe_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);