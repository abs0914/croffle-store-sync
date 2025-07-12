-- Add pricing fields to recipe_templates table
ALTER TABLE recipe_templates 
ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS suggested_markup_percentage NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS pos_price NUMERIC DEFAULT 0;