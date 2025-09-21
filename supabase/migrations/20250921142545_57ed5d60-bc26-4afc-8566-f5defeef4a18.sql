-- Delete dashboard metrics data for Sept 21, 2025 for Sugbo Mercado (IT Park, Cebu)
-- Store ID: d7c47e6b-f20a-4543-a6bd-000398f72df5

-- Delete store metrics for the specific date
DELETE FROM store_metrics 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
AND metric_date = '2025-09-21';

-- Delete any cumulative sales data that might be cached
DELETE FROM bir_cumulative_sales 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Reset any BIR readings for the date
DELETE FROM bir_readings 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
AND DATE(reading_date) = '2025-09-21';

-- Delete any electronic journal entries
DELETE FROM bir_ejournal 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
AND journal_date = '2025-09-21';

-- Log the dashboard data cleanup
INSERT INTO cleanup_log (action, table_name, details) VALUES 
('DELETE_DASHBOARD_METRICS', 'store_metrics', 
 jsonb_build_object(
   'store_id', 'd7c47e6b-f20a-4543-a6bd-000398f72df5',
   'store_name', 'Sugbo Mercado (IT Park, Cebu)',
   'date', '2025-09-21',
   'tables_cleared', ARRAY['store_metrics', 'bir_cumulative_sales', 'bir_readings', 'bir_ejournal'],
   'reason', 'Clear all dashboard data sources to reset metrics to zero'
 ));