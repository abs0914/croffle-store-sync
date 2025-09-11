-- Phase 1: Simplified Mix & Match Data Fixes
-- Add product_type classification and base templates

-- 1. Add product_type to product_catalog for Mix & Match identification
ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'regular';

-- 2. Mark Mix & Match products  
UPDATE product_catalog 
SET product_type = 'mix_match'
WHERE product_name ILIKE '%mini croffle%' 
   OR product_name ILIKE '%croffle overload%';

-- 3. Create index for faster Mix & Match queries
CREATE INDEX IF NOT EXISTS idx_product_catalog_product_type ON product_catalog(product_type) WHERE product_type = 'mix_match';

-- 4. Ensure base recipe templates exist
INSERT INTO recipe_templates (id, name, description, category_name, is_active, created_at)
SELECT 
  gen_random_uuid(),
  'Mini Croffle Base',
  'Base recipe for Mini Croffle products',
  'Mini Croffle', 
  true,
  now()
WHERE NOT EXISTS (SELECT 1 FROM recipe_templates WHERE name = 'Mini Croffle Base');

INSERT INTO recipe_templates (id, name, description, category_name, is_active, created_at)
SELECT 
  gen_random_uuid(),
  'Croffle Overload Base',
  'Base recipe for Croffle Overload products', 
  'Croffle Overload',
  true,
  now()
WHERE NOT EXISTS (SELECT 1 FROM recipe_templates WHERE name = 'Croffle Overload Base');