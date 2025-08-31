-- Clean up the recipe templates and recreate with correct base ingredients only
DELETE FROM recipe_template_ingredients WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name IN ('Croffle Overload', 'Mini Croffle')
);

DELETE FROM recipe_templates WHERE name IN ('Croffle Overload', 'Mini Croffle');

-- Recreate clean recipe templates with only base ingredients
INSERT INTO recipe_templates (
  name,
  description,
  category_name,
  instructions,
  serving_size,
  is_active,
  created_by
) VALUES 
(
  'Croffle Overload',
  'Base Mix & Match product with regular croissant, whipped cream, popsicle, mini spoon and overload cup',
  'Mix & Match',
  'Base components for Croffle Overload Mix & Match product',
  1,
  true,
  (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)
),
(
  'Mini Croffle',
  'Base Mix & Match product with regular croissant, whipped cream, popsicle and mini take out box',
  'Mix & Match',
  'Base components for Mini Croffle Mix & Match product',
  1,
  true,
  (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)
);

-- Get the IDs for the newly created templates and create ONLY base ingredients
DO $$
DECLARE
    croffle_overload_id UUID;
    mini_croffle_id UUID;
BEGIN
    -- Get template IDs
    SELECT id INTO croffle_overload_id FROM recipe_templates WHERE name = 'Croffle Overload';
    SELECT id INTO mini_croffle_id FROM recipe_templates WHERE name = 'Mini Croffle';
    
    -- Create ONLY base ingredients for Croffle Overload (0.5x quantities)
    INSERT INTO recipe_template_ingredients (
      recipe_template_id,
      ingredient_name,
      quantity,
      unit,
      cost_per_unit,
      location_type
    ) VALUES 
    (croffle_overload_id, 'Regular Croissant', 0.5, 'pieces', 0, 'all'),
    (croffle_overload_id, 'Whipped Cream', 0.5, 'pieces', 0, 'all'),
    (croffle_overload_id, 'Popsicle', 0.5, 'pieces', 0, 'all'),
    (croffle_overload_id, 'Mini Spoon', 0.5, 'pieces', 0, 'all'),
    (croffle_overload_id, 'Overload Cup', 0.5, 'pieces', 0, 'all');
    
    -- Create ONLY base ingredients for Mini Croffle (0.5x quantities)
    INSERT INTO recipe_template_ingredients (
      recipe_template_id,
      ingredient_name,
      quantity,
      unit,
      cost_per_unit,
      location_type
    ) VALUES 
    (mini_croffle_id, 'Regular Croissant', 0.5, 'pieces', 0, 'all'),
    (mini_croffle_id, 'Whipped Cream', 0.5, 'pieces', 0, 'all'),
    (mini_croffle_id, 'Popsicle', 0.5, 'pieces', 0, 'all'),
    (mini_croffle_id, 'Mini take out box', 0.5, 'pieces', 0, 'all');
END $$;