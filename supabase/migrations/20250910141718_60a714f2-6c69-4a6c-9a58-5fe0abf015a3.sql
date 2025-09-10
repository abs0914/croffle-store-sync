-- MANUAL PREMIUM DEPLOYMENT (One Template at a Time)
-- Step 1: Deploy Premium - Biscoff Only

-- Create recipes for Premium - Biscoff
INSERT INTO recipes (
  name,
  store_id,
  template_id,
  is_active,
  serving_size,
  instructions,
  total_cost,
  cost_per_serving
)
SELECT 
  'Premium - Biscoff',
  s.id,
  rt.id,
  true,
  1,
  rt.instructions,
  53.42, -- 30+8+2.5+5.62+6+0.6+0.7
  53.42
FROM recipe_templates rt
CROSS JOIN stores s
WHERE rt.name = 'Premium - Biscoff'
  AND rt.is_active = true
  AND s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipes r 
    WHERE r.name = 'Premium - Biscoff'
    AND r.store_id = s.id
  );