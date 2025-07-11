
-- Update existing recipe template ingredients to link with commissary inventory
UPDATE recipe_template_ingredients 
SET commissary_item_id = ci.id
FROM commissary_inventory ci
WHERE recipe_template_ingredients.commissary_item_id IS NULL
  AND LOWER(TRIM(recipe_template_ingredients.ingredient_name)) = LOWER(TRIM(ci.name))
  AND ci.is_active = true;

-- Verify the update worked
SELECT 
  rti.ingredient_name,
  rti.commissary_item_id,
  ci.name as commissary_name
FROM recipe_template_ingredients rti
LEFT JOIN commissary_inventory ci ON rti.commissary_item_id = ci.id
WHERE rti.recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE is_active = true
)
ORDER BY rti.ingredient_name;
