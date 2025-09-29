-- Update "Glaze" category name to "Plain" across all stores
UPDATE categories 
SET name = 'Plain', 
    updated_at = NOW()
WHERE LOWER(name) = 'glaze';