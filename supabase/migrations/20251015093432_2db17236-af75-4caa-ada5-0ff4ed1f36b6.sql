-- Update Biscoff Biscuit price to ₱10 for store c3bfe728-1550-4f4d-af04-12899f3b276b
UPDATE product_catalog 
SET price = 10.00 
WHERE product_name = 'Biscoff Biscuit' 
  AND store_id = 'c3bfe728-1550-4f4d-af04-12899f3b276b'
  AND price = 0.00;