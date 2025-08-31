-- Create recipe templates for Mix & Match base products
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

-- Get the IDs for the newly created templates
DO $$
DECLARE
    croffle_overload_id UUID;
    mini_croffle_id UUID;
BEGIN
    -- Get template IDs
    SELECT id INTO croffle_overload_id FROM recipe_templates WHERE name = 'Croffle Overload';
    SELECT id INTO mini_croffle_id FROM recipe_templates WHERE name = 'Mini Croffle';
    
    -- Create ingredients for Croffle Overload
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
    
    -- Create ingredients for Mini Croffle
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