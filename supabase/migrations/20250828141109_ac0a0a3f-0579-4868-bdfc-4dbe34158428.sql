-- Add combo-related columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS combo_main text,
ADD COLUMN IF NOT EXISTS combo_add_on text;

-- Add comment to explain the combo columns
COMMENT ON COLUMN products.combo_main IS 'Main product for combo (e.g., Croffle type)';
COMMENT ON COLUMN products.combo_add_on IS 'Add-on product for combo (e.g., Espresso type)';

-- Create index for combo queries
CREATE INDEX IF NOT EXISTS idx_products_combo_main ON products(combo_main) WHERE combo_main IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_combo_add_on ON products(combo_add_on) WHERE combo_add_on IS NOT NULL;