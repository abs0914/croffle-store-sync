-- Update recipe template ingredients with correct quantities
DO $$
DECLARE
    croffle_overload_id UUID;
    mini_croffle_id UUID;
BEGIN
    -- Get template IDs
    SELECT id INTO croffle_overload_id FROM recipe_templates WHERE name = 'Croffle Overload';
    SELECT id INTO mini_croffle_id FROM recipe_templates WHERE name = 'Mini Croffle';
    
    -- Delete existing template ingredients
    DELETE FROM recipe_template_ingredients WHERE recipe_template_id IN (croffle_overload_id, mini_croffle_id);
    
    -- Insert correct Croffle Overload ingredients with proper quantities
    INSERT INTO recipe_template_ingredients (
      recipe_template_id,
      ingredient_name,
      quantity,
      unit,
      cost_per_unit,
      location_type
    ) VALUES 
    (croffle_overload_id, 'Regular Croissant', 0.5, 'pieces', 0, 'all'),
    (croffle_overload_id, 'Whipped Cream', 1.0, 'pieces', 0, 'all'),
    (croffle_overload_id, 'Popsicle', 1.0, 'pieces', 0, 'all'),
    (croffle_overload_id, 'Mini Spoon', 1.0, 'pieces', 0, 'all'),
    (croffle_overload_id, 'Overload Cup', 1.0, 'pieces', 0, 'all');
    
    -- Insert correct Mini Croffle ingredients with proper quantities
    INSERT INTO recipe_template_ingredients (
      recipe_template_id,
      ingredient_name,
      quantity,
      unit,
      cost_per_unit,
      location_type
    ) VALUES 
    (mini_croffle_id, 'Regular Croissant', 0.5, 'pieces', 0, 'all'),
    (mini_croffle_id, 'Whipped Cream', 1.0, 'pieces', 0, 'all'),
    (mini_croffle_id, 'Popsicle', 1.0, 'pieces', 0, 'all'),
    (mini_croffle_id, 'Mini Take Out Box', 1.0, 'pieces', 0, 'all');
END $$;