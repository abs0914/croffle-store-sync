-- Clear store_metrics data for Sugbo Mercado to show real zero values
-- since we cleared the underlying transaction data

-- Delete store_metrics data for Sugbo Mercado store
DELETE FROM store_metrics 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';