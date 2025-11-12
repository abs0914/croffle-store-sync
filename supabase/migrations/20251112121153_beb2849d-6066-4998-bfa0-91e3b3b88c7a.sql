-- Add business_category column to preserve original category names for display
ALTER TABLE commissary_inventory 
ADD COLUMN IF NOT EXISTS business_category TEXT;

-- Add a comment explaining the field
COMMENT ON COLUMN commissary_inventory.business_category IS 'Original business category name for display (e.g., Croffle Items, SAUCES, TOPPINGS)';