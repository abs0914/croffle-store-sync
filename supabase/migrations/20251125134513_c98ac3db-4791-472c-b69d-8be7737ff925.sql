
-- Update 4 products from "addon" to "Add-on" category to standardize naming
UPDATE recipe_templates
SET category_name = 'Add-on'
WHERE id IN (
  'ac9cdf0a-f235-49b0-bdcc-0f4a2707ffb0', -- Chocolate Crumble
  '33adc4f7-0ac6-478b-8269-01e263518fcd', -- Crushed Grahams
  '9e844eb6-c7bc-49bd-93a0-db88f8d21eb1', -- Crushed Oreo
  '45f202c3-83db-4d6b-8466-41c486da99b4'  -- Matcha Crumble
);
