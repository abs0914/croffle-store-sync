-- End stuck active shift from July 12th for Sugbo Mercado (IT Park, Cebu)
UPDATE shifts 
SET 
  end_time = NOW(),
  ending_cash = starting_cash,
  status = 'closed'
WHERE 
  id = '66f4f8f0-a026-4f25-9f5c-325d99c8908d'
  AND status = 'active'
  AND store_id = (SELECT id FROM stores WHERE name = 'Sugbo Mercado (IT Park, Cebu)');