
-- Fix Mix & Match product prices across all stores
-- Croffle Overload should be ₱99, Mini Croffle should be ₱65

-- Update Croffle Overload to ₱99
UPDATE product_catalog
SET price = 99.00, updated_at = NOW()
WHERE id IN (
  '7592b894-86f2-4912-b225-391e2a9cf02d',  -- Gaisano Capital SRP
  '288855e3-e77b-4895-8e94-eed9ca46e94c',  -- Molave Kaffee and Bistro
  '6a44560f-65b9-452c-b78d-935263ee36e0',  -- Robinsons Cybergate Cebu
  '8f5c545f-e4db-45ad-8b9b-2d074400b8ca',  -- Robinsons Marasbaras
  'faab1eeb-d47d-412b-af71-6238598ce23f'   -- SM Savemore Tacloban
);

-- Update Mini Croffle to ₱65 (Robinsons North)
UPDATE product_catalog
SET price = 65.00, updated_at = NOW()
WHERE id = 'd9463216-e2c0-4788-8853-e9736c881fd0';  -- Robinsons North
