-- Clean up commissary_inventory duplicates
-- Keep only the most recent entry for each unique item name

-- First, create a temporary table with the IDs to keep (most recent entry per item name)
CREATE TEMP TABLE items_to_keep AS
SELECT DISTINCT ON (name)
  id
FROM commissary_inventory
ORDER BY name, created_at DESC, id;

-- Delete all entries that are NOT in the items_to_keep list
DELETE FROM commissary_inventory
WHERE id NOT IN (SELECT id FROM items_to_keep);

-- Add a unique constraint on the name column to prevent future duplicates
ALTER TABLE commissary_inventory
ADD CONSTRAINT commissary_inventory_name_unique UNIQUE (name);

-- Log the cleanup
DO $$
DECLARE
  items_kept INTEGER;
BEGIN
  SELECT COUNT(*) INTO items_kept FROM commissary_inventory;
  RAISE NOTICE 'Cleanup complete. Kept % unique items', items_kept;
END $$;