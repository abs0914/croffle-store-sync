-- Insert Recipe Templates with Pre-calculated Data
-- Direct insertion of 15 croffle recipes (without total_cost and suggested_price columns)

DO $$
DECLARE
  tiramisu_id UUID := gen_random_uuid();
  choco_nut_id UUID := gen_random_uuid();
  caramel_delight_id UUID := gen_random_uuid();
  choco_marshmallow_id UUID := gen_random_uuid();
  strawberry_id UUID := gen_random_uuid();
  mango_id UUID := gen_random_uuid();
  blueberry_id UUID := gen_random_uuid();
  biscoff_id UUID := gen_random_uuid();
  nutella_id UUID := gen_random_uuid();
  kitkat_id UUID := gen_random_uuid();
  cookies_cream_id UUID := gen_random_uuid();
  choco_overload_id UUID := gen_random_uuid();
  matcha_id UUID := gen_random_uuid();
  dark_chocolate_id UUID := gen_random_uuid();
  current_user_id UUID;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO current_user_id;
  
  -- Insert Recipe Templates
  INSERT INTO recipe_templates (id, name, description, category_name, instructions, yield_quantity, serving_size, version, is_active, created_by) VALUES
  (tiramisu_id, 'Tiramisu', 'Classic croffle with tiramisu flavor', 'Classic', '1. Prepare tiramisu base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (choco_nut_id, 'Choco Nut', 'Classic croffle with chocolate and nuts', 'Classic', '1. Prepare choco nut base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (caramel_delight_id, 'Caramel Delight', 'Classic croffle with caramel and sprinkles', 'Classic', '1. Prepare caramel delight base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (choco_marshmallow_id, 'Choco Marshmallow', 'Classic croffle with chocolate and marshmallow', 'Classic', '1. Prepare choco marshmallow base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (strawberry_id, 'Strawberry', 'Fruity croffle with strawberry jam', 'Fruity', '1. Prepare strawberry base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (mango_id, 'Mango', 'Fruity croffle with mango jam and graham', 'Fruity', '1. Prepare mango base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (blueberry_id, 'Blueberry', 'Fruity croffle with blueberry jam and graham', 'Fruity', '1. Prepare blueberry base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (biscoff_id, 'Biscoff', 'Premium croffle with biscoff cookies and crumbs', 'Premium', '1. Prepare biscoff base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (nutella_id, 'Nutella', 'Premium croffle with nutella spread', 'Premium', '1. Prepare nutella base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (kitkat_id, 'Kitkat', 'Premium croffle with kitkat chocolate', 'Premium', '1. Prepare kitkat base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (cookies_cream_id, 'Cookies & Cream', 'Premium croffle with oreo cookies and cream', 'Premium', '1. Prepare cookies & cream base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (choco_overload_id, 'Choco Overload', 'Premium croffle with double chocolate', 'Premium', '1. Prepare choco overload base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (matcha_id, 'Matcha', 'Premium croffle with matcha flavor', 'Premium', '1. Prepare matcha base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id),
  (dark_chocolate_id, 'Dark Chocolate', 'Premium croffle with dark chocolate and crumble', 'Premium', '1. Prepare dark chocolate base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper', 1, 1, 1, true, current_user_id);

  -- Insert Recipe Template Ingredients
  -- Tiramisu ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (tiramisu_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (tiramisu_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (tiramisu_id, 'Tiramisu', 'Tiramisu', 1, 'portion', 3.5, 'portion', 'portion', 1, 'all'),
  (tiramisu_id, 'Choco Flakes', 'Choco Flakes', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (tiramisu_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (tiramisu_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Choco Nut ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (choco_nut_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (choco_nut_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (choco_nut_id, 'Chocolate', 'Chocolate', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (choco_nut_id, 'Peanut', 'Peanut', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (choco_nut_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (choco_nut_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Caramel Delight ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (caramel_delight_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (caramel_delight_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (caramel_delight_id, 'Caramel', 'Caramel', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (caramel_delight_id, 'Colored Sprinkles', 'Colored Sprinkles', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (caramel_delight_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (caramel_delight_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Choco Marshmallow ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (choco_marshmallow_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (choco_marshmallow_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (choco_marshmallow_id, 'Chocolate', 'Chocolate', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (choco_marshmallow_id, 'Marshmallow', 'Marshmallow', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (choco_marshmallow_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (choco_marshmallow_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Strawberry ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (strawberry_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (strawberry_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (strawberry_id, 'Strawberry Jam', 'Strawberry Jam', 1, 'scoop', 5, 'scoop', 'scoop', 1, 'all'),
  (strawberry_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (strawberry_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Mango ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (mango_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (mango_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (mango_id, 'Mango Jam', 'Mango Jam', 1, 'scoop', 7, 'scoop', 'scoop', 1, 'all'),
  (mango_id, 'Graham Crushed', 'Graham Crushed', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (mango_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (mango_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Blueberry ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (blueberry_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (blueberry_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (blueberry_id, 'Blueberry Jam', 'Blueberry Jam', 1, 'scoop', 7.5, 'scoop', 'scoop', 1, 'all'),
  (blueberry_id, 'Graham Crushed', 'Graham Crushed', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (blueberry_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (blueberry_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Biscoff ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (biscoff_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (biscoff_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (biscoff_id, 'Biscoff Crushed', 'Biscoff Crushed', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (biscoff_id, 'Biscoff', 'Biscoff', 1, 'piece', 5.62, 'piece', 'piece', 1, 'all'),
  (biscoff_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (biscoff_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Nutella ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (nutella_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (nutella_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (nutella_id, 'Nutella', 'Nutella', 1, 'portion', 4.5, 'portion', 'portion', 1, 'all'),
  (nutella_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (nutella_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Kitkat ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (kitkat_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (kitkat_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (kitkat_id, 'Chocolate', 'Chocolate', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (kitkat_id, 'Kitkat', 'Kitkat', 0.5, 'piece', 6.25, 'piece', 'piece', 1, 'all'),
  (kitkat_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (kitkat_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Cookies & Cream ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (cookies_cream_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (cookies_cream_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (cookies_cream_id, 'Oreo Crushed', 'Oreo Crushed', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (cookies_cream_id, 'Oreo Cookies', 'Oreo Cookies', 1, 'piece', 2.9, 'piece', 'piece', 1, 'all'),
  (cookies_cream_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (cookies_cream_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Choco Overload ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (choco_overload_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (choco_overload_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (choco_overload_id, 'Chocolate', 'Chocolate', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (choco_overload_id, 'Choco Flakes', 'Choco Flakes', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (choco_overload_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (choco_overload_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Matcha ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (matcha_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (matcha_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (matcha_id, 'Matcha crumble', 'Matcha crumble', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (matcha_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (matcha_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

  -- Dark Chocolate ingredients
  INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, commissary_item_name, quantity, unit, cost_per_unit, recipe_unit, purchase_unit, conversion_factor, location_type) VALUES
  (dark_chocolate_id, 'REGULAR CROISSANT', 'REGULAR CROISSANT', 1, 'piece', 30, 'piece', 'piece', 1, 'all'),
  (dark_chocolate_id, 'WHIPPED CREAM', 'WHIPPED CREAM', 1, 'serving', 8, 'serving', 'serving', 1, 'all'),
  (dark_chocolate_id, 'Dark Chocolate', 'Dark Chocolate', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (dark_chocolate_id, 'Chocolate crumble', 'Chocolate crumble', 1, 'portion', 2.5, 'portion', 'portion', 1, 'all'),
  (dark_chocolate_id, 'Chopstick', 'Chopstick', 1, 'pair', 0.6, 'pair', 'pair', 1, 'all'),
  (dark_chocolate_id, 'Wax Paper', 'Wax Paper', 1, 'piece', 0.7, 'piece', 'piece', 1, 'all');

END $$;