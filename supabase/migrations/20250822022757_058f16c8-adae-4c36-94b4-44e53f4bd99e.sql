-- Create missing recipe templates for Sugbo Mercado products
INSERT INTO recipe_templates (
  name,
  category_name,
  description,
  instructions,
  serving_size,
  is_active,
  created_by
) VALUES
-- Biscuit/Toppings
('Biscoff Biscuit', 'Toppings', 'Crispy Biscoff biscuit for toppings', 'Use as topping or side item', 1, true, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1)),
('Graham Crushed', 'Toppings', 'Crushed graham crackers for toppings', 'Use as topping or base ingredient', 1, true, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1)),
('Chocolate Crumbs', 'Toppings', 'Chocolate crumbs for toppings', 'Use as topping for desserts and drinks', 1, true, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1)),

-- Sauces
('Caramel Sauce', 'Sauces', 'Rich caramel sauce for drinks and desserts', 'Drizzle on top or mix into drinks', 1, true, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1)),

-- Hot Beverages  
('Caramel Latte (Hot)', 'Hot Beverages', 'Hot caramel latte with espresso and steamed milk', '1. Prepare 2 shots of espresso\n2. Steam milk to 60-65°C\n3. Add caramel sauce\n4. Pour steamed milk and create latte art\n5. Drizzle caramel on top', 1, true, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1)),
('Strawberry Latte', 'Hot Beverages', 'Creamy latte with strawberry flavor', '1. Prepare 2 shots of espresso\n2. Steam milk\n3. Add strawberry syrup\n4. Pour and garnish', 1, true, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1)),

-- Cold Beverages
('Caramel Latte (Iced)', 'Cold Beverages', 'Iced caramel latte with cold milk', '1. Prepare 2 shots of espresso over ice\n2. Add cold milk\n3. Add caramel sauce\n4. Stir well and serve', 1, true, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1)),
('Matcha Blended', 'Cold Beverages', 'Blended matcha frappe with ice', '1. Blend matcha powder with ice\n2. Add milk and sweetener\n3. Blend until smooth\n4. Serve with whipped cream', 1, true, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1)),
('Oreo Strawberry', 'Cold Beverages', 'Oreo and strawberry blended drink', '1. Blend Oreo cookies with ice\n2. Add strawberry syrup and milk\n3. Blend until smooth\n4. Top with whipped cream and Oreo crumbs', 1, true, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1)),
('Strawberry Kiss', 'Cold Beverages', 'Sweet strawberry flavored drink', '1. Mix strawberry syrup with milk\n2. Add ice and blend\n3. Serve with strawberry garnish', 1, true, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1)),
('Vanilla Caramel', 'Cold Beverages', 'Vanilla and caramel blended drink', '1. Mix vanilla syrup with caramel sauce\n2. Add milk and ice\n3. Blend until smooth\n4. Drizzle caramel on top', 1, true, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') AND is_active = true LIMIT 1))

ON CONFLICT (name) DO NOTHING;