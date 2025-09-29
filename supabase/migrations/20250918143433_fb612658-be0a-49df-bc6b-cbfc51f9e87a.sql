-- Clear store_metrics data for Sugbo Mercado (IT Park, Cebu)
DELETE FROM store_metrics 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Confirmation query
SELECT 
  'Store metrics data cleared for Sugbo Mercado (IT Park, Cebu)' AS status,
  COUNT(*) as remaining_metrics
FROM store_metrics 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';