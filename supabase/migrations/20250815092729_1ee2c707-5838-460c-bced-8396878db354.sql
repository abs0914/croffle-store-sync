-- Fix the Caramel Sauce stock issue that's blocking payments
UPDATE inventory_stock 
SET stock_quantity = 50,
    serving_ready_quantity = 50,
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
    AND item = 'Caramel Sauce';