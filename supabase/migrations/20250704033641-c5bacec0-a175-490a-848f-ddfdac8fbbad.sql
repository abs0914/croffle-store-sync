-- Remove hardcoded inventory items that should come from commissary ordering
DELETE FROM inventory_stock 
WHERE item IN ('butter', 'eggs', 'napkins', 'paper bags', 'sugar')
   OR item ILIKE '%butter%' 
   OR item ILIKE '%eggs%' 
   OR item ILIKE '%napkin%' 
   OR item ILIKE '%paper bag%' 
   OR item ILIKE '%sugar%';