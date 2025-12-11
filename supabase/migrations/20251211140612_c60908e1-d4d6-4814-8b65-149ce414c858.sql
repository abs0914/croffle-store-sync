-- Delete inventory movements for these transactions
DELETE FROM inventory_movements 
WHERE reference_id IN (
  'a3fc05fa-175c-4b31-96c3-a111aec5e270',
  '6da71e50-5630-4d69-a825-74f4869493e7',
  '838f76d3-7c16-4eeb-a560-be37fd3af41c'
);

-- Delete transaction items
DELETE FROM transaction_items 
WHERE transaction_id IN (
  'a3fc05fa-175c-4b31-96c3-a111aec5e270',
  '6da71e50-5630-4d69-a825-74f4869493e7',
  '838f76d3-7c16-4eeb-a560-be37fd3af41c'
);

-- Delete the transactions
DELETE FROM transactions 
WHERE id IN (
  'a3fc05fa-175c-4b31-96c3-a111aec5e270',
  '6da71e50-5630-4d69-a825-74f4869493e7',
  '838f76d3-7c16-4eeb-a560-be37fd3af41c'
);