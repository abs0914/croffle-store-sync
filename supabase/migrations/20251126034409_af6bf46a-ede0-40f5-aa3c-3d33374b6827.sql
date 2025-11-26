-- Step 1: Delete purchase_order_items that reference items to be deleted
DELETE FROM purchase_order_items 
WHERE inventory_stock_id IN (
  -- GLAZE POWDER duplicate
  'bc6b7d19-b9ca-4f52-85e0-d518dd01ce3d',
  -- REGULAR CROISSANT duplicates
  '28558317-510c-42b2-88a0-8bdebeaa5e44',
  '4d1ca654-eac1-4835-9d91-c43ef70af0ee',
  -- Softdrinks (not used)
  '9323a556-7209-47d4-86c3-86d08db7c6dc',
  '2b176540-27e1-4d06-890e-a21d0bcc182a',
  'de87e920-6d19-433e-b659-bda89670bcf5',
  'd70dcfff-e0a7-4140-8dae-76b46dbcf088',
  '59f569e5-049d-46c7-b2a1-ad2d7737dc38',
  '0e35b4aa-b996-4866-a6e3-25269d8b3948'
) OR inventory_stock_id IN (
  -- Water items
  SELECT id FROM inventory_stock WHERE item = 'Water'
);

-- Step 2: Delete recipe_template_ingredients that reference items to be deleted
DELETE FROM recipe_template_ingredients 
WHERE inventory_stock_id IN (
  -- GLAZE POWDER duplicate
  'bc6b7d19-b9ca-4f52-85e0-d518dd01ce3d',
  -- REGULAR CROISSANT duplicates
  '28558317-510c-42b2-88a0-8bdebeaa5e44',
  '4d1ca654-eac1-4835-9d91-c43ef70af0ee',
  -- Softdrinks (not used)
  '9323a556-7209-47d4-86c3-86d08db7c6dc',
  '2b176540-27e1-4d06-890e-a21d0bcc182a',
  'de87e920-6d19-433e-b659-bda89670bcf5',
  'd70dcfff-e0a7-4140-8dae-76b46dbcf088',
  '59f569e5-049d-46c7-b2a1-ad2d7737dc38',
  '0e35b4aa-b996-4866-a6e3-25269d8b3948'
) OR inventory_stock_id IN (
  -- Water items
  SELECT id FROM inventory_stock WHERE item = 'Water'
);

-- Step 3: Delete conversion_mappings for items to be deleted
DELETE FROM conversion_mappings 
WHERE inventory_stock_id IN (
  -- GLAZE POWDER duplicate
  'bc6b7d19-b9ca-4f52-85e0-d518dd01ce3d',
  -- REGULAR CROISSANT duplicates
  '28558317-510c-42b2-88a0-8bdebeaa5e44',
  '4d1ca654-eac1-4835-9d91-c43ef70af0ee',
  -- Softdrinks (not used)
  '9323a556-7209-47d4-86c3-86d08db7c6dc',
  '2b176540-27e1-4d06-890e-a21d0bcc182a',
  'de87e920-6d19-433e-b659-bda89670bcf5',
  'd70dcfff-e0a7-4140-8dae-76b46dbcf088',
  '59f569e5-049d-46c7-b2a1-ad2d7737dc38',
  '0e35b4aa-b996-4866-a6e3-25269d8b3948'
) OR inventory_stock_id IN (
  -- Water items
  SELECT id FROM inventory_stock WHERE item = 'Water'
);

-- Step 4: Delete inventory_stock items
DELETE FROM inventory_stock 
WHERE id IN (
  -- GLAZE POWDER duplicate
  'bc6b7d19-b9ca-4f52-85e0-d518dd01ce3d',
  -- REGULAR CROISSANT duplicates
  '28558317-510c-42b2-88a0-8bdebeaa5e44',
  '4d1ca654-eac1-4835-9d91-c43ef70af0ee',
  -- Softdrinks (not used)
  '9323a556-7209-47d4-86c3-86d08db7c6dc',
  '2b176540-27e1-4d06-890e-a21d0bcc182a',
  'de87e920-6d19-433e-b659-bda89670bcf5',
  'd70dcfff-e0a7-4140-8dae-76b46dbcf088',
  '59f569e5-049d-46c7-b2a1-ad2d7737dc38',
  '0e35b4aa-b996-4866-a6e3-25269d8b3948'
) OR item = 'Water';

-- Step 5: Update Vanilla Ice Cream unit from "Scoop" to "serving"
UPDATE inventory_stock 
SET unit = 'serving', updated_at = now()
WHERE item = 'Vanilla Ice Cream' AND unit = 'Scoop';

UPDATE recipe_template_ingredients 
SET unit = 'serving'
WHERE ingredient_name = 'Vanilla Ice Cream' AND unit = 'scoop';

-- Step 6: Rename "Take out box w cover" to "Take out box open"
UPDATE inventory_stock 
SET item = 'Take out box open', updated_at = now()
WHERE item = 'Take out box w cover';

UPDATE conversion_mappings 
SET recipe_ingredient_name = 'Take out box open', updated_at = now()
WHERE recipe_ingredient_name = 'Take out box w cover';

UPDATE recipe_template_ingredients 
SET ingredient_name = 'Take out box open'
WHERE ingredient_name = 'Take out box w cover';

UPDATE recipes 
SET name = 'Take out box open', updated_at = now()
WHERE name = 'Take out box w cover';