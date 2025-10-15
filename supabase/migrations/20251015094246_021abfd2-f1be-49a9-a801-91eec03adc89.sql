-- Activate all addon categories that are currently inactive
UPDATE categories 
SET is_active = true 
WHERE LOWER(name) IN ('addon', 'add-on', 'add-ons', 'addons')
  AND is_active = false;