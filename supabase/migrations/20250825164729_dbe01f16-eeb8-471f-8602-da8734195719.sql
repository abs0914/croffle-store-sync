-- Update commissary inventory to set reasonable costs for zero-cost items
-- Keep zero costs for packaging items but set reasonable defaults for others
UPDATE commissary_inventory 
SET unit_cost = CASE 
  -- Keep zero cost for packaging items
  WHEN LOWER(name) LIKE '%cup%' OR LOWER(name) LIKE '%lid%' OR LOWER(name) LIKE '%container%' OR 
       LOWER(name) LIKE '%wrapper%' OR LOWER(name) LIKE '%bag%' OR LOWER(name) LIKE '%box%' OR 
       LOWER(name) LIKE '%paper%' OR LOWER(name) LIKE '%packaging%' THEN 0
  -- Set reasonable costs for ingredients based on category
  WHEN LOWER(name) LIKE '%sauce%' OR LOWER(name) LIKE '%syrup%' THEN 2.50
  WHEN LOWER(name) LIKE '%sprinkle%' OR LOWER(name) LIKE '%flake%' OR LOWER(name) LIKE '%crushed%' THEN 1.50
  WHEN LOWER(name) LIKE '%jam%' OR LOWER(name) LIKE '%cream%' THEN 3.00
  WHEN LOWER(name) LIKE '%caramel%' OR LOWER(name) LIKE '%chocolate%' THEN 2.75
  WHEN LOWER(name) LIKE '%vanilla%' OR LOWER(name) LIKE '%flavor%' THEN 1.80
  WHEN LOWER(name) LIKE '%biscoff%' OR LOWER(name) LIKE '%premium%' THEN 4.00
  WHEN LOWER(name) LIKE '%milk%' OR LOWER(name) LIKE '%creamer%' THEN 1.25
  ELSE 1.50 -- Default cost for unrecognized ingredients
END
WHERE unit_cost = 0 OR unit_cost IS NULL;