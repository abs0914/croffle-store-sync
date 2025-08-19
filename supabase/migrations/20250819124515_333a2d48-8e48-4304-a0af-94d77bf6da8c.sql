-- Remove duplicate espresso templates from "Hot Drinks" category that are not deployed
UPDATE recipe_templates 
SET is_active = false, 
    updated_at = NOW()
WHERE category_name = 'Hot Drinks' 
  AND name IN (
    'AMERICANO (Hot)', 'AMERICANO (Iced)', 
    'CAFE MOCHA (Hot)', 'CAFE MOCHA (Iced)',
    'CAPPUCINO (Hot)', 'CAPPUCINO (Iced)'
  );