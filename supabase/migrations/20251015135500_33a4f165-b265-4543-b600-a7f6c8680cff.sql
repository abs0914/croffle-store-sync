
-- Move all products from "addon" category to "Add-on" category for each store
UPDATE product_catalog pc
SET category_id = addon_cat.id
FROM categories addon_cat
WHERE addon_cat.name = 'Add-on' 
  AND addon_cat.store_id = pc.store_id
  AND pc.category_id IN (
    SELECT id FROM categories WHERE name = 'addon'
  );

-- Deactivate the "addon" categories since we're standardizing on "Add-on"
UPDATE categories
SET is_active = false
WHERE name = 'addon';
