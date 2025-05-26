-- Test data for verifying cashier report fixes
-- This creates real transaction data with proper cashier names to test:
-- 1. Cashier name resolution from app_users table
-- 2. Store-specific data filtering  
-- 3. Sample data detection with real names
-- 4. Store switching functionality

-- Create test app_users (real cashiers)
INSERT INTO app_users (user_id, first_name, last_name, role, is_active, store_ids) 
VALUES ('test-user-001', 'Maria', 'Santos', 'cashier', true, '{"a12a8269-5cbc-4a78-bae0-d6f166e1446d"}')
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  store_ids = EXCLUDED.store_ids;

INSERT INTO app_users (user_id, first_name, last_name, role, is_active, store_ids) 
VALUES ('test-user-002', 'Juan', 'Dela Cruz', 'cashier', true, '{"a12a8269-5cbc-4a78-bae0-d6f166e1446d","fd45e07e-7832-4f51-b46b-7ef604359b86"}')
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  store_ids = EXCLUDED.store_ids;

INSERT INTO app_users (user_id, first_name, last_name, role, is_active, store_ids) 
VALUES ('test-user-003', 'Ana', 'Rodriguez', 'cashier', true, '{"fd45e07e-7832-4f51-b46b-7ef604359b86"}')
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  store_ids = EXCLUDED.store_ids;

-- Create test transactions for Store 1 (Robinsons North)
INSERT INTO transactions (id, store_id, user_id, total, status, created_at, items)
VALUES ('test-tx-001', 'a12a8269-5cbc-4a78-bae0-d6f166e1446d', 'test-user-001', 450.75, 'completed', '2025-05-26T09:30:00Z', '[{"name":"Iced Coffee","quantity":2,"price":120},{"name":"Croissant","quantity":3,"price":70.25}]')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  total = EXCLUDED.total,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  items = EXCLUDED.items;

INSERT INTO transactions (id, store_id, user_id, total, status, created_at, items)
VALUES ('test-tx-002', 'a12a8269-5cbc-4a78-bae0-d6f166e1446d', 'test-user-001', 280.50, 'completed', '2025-05-26T11:15:00Z', '[{"name":"Latte","quantity":1,"price":140},{"name":"Sandwich","quantity":1,"price":140.5}]')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  total = EXCLUDED.total,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  items = EXCLUDED.items;

INSERT INTO transactions (id, store_id, user_id, total, status, created_at, items)
VALUES ('test-tx-003', 'a12a8269-5cbc-4a78-bae0-d6f166e1446d', 'test-user-002', 650.00, 'completed', '2025-05-26T14:20:00Z', '[{"name":"Cake Slice","quantity":2,"price":180},{"name":"Cappuccino","quantity":2,"price":145}]')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  total = EXCLUDED.total,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  items = EXCLUDED.items;

INSERT INTO transactions (id, store_id, user_id, total, status, created_at, items)
VALUES ('test-tx-004', 'a12a8269-5cbc-4a78-bae0-d6f166e1446d', 'test-user-002', 195.25, 'completed', '2025-05-26T16:45:00Z', '[{"name":"Muffin","quantity":3,"price":65.08}]')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  total = EXCLUDED.total,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  items = EXCLUDED.items;

-- Create test transactions for Store 2
INSERT INTO transactions (id, store_id, user_id, total, status, created_at, items)
VALUES ('test-tx-005', 'fd45e07e-7832-4f51-b46b-7ef604359b86', 'test-user-002', 320.00, 'completed', '2025-05-26T10:00:00Z', '[{"name":"Americano","quantity":2,"price":110},{"name":"Bagel","quantity":1,"price":100}]')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  total = EXCLUDED.total,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  items = EXCLUDED.items;

INSERT INTO transactions (id, store_id, user_id, total, status, created_at, items)
VALUES ('test-tx-006', 'fd45e07e-7832-4f51-b46b-7ef604359b86', 'test-user-003', 475.50, 'completed', '2025-05-26T13:30:00Z', '[{"name":"Frappuccino","quantity":1,"price":165},{"name":"Club Sandwich","quantity":1,"price":210.5},{"name":"Cookie","quantity":2,"price":50}]')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  total = EXCLUDED.total,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  items = EXCLUDED.items;

-- Create test shifts for Store 1
INSERT INTO shifts (id, store_id, user_id, start_time, end_time, starting_cash, ending_cash, status)
VALUES ('test-shift-001', 'a12a8269-5cbc-4a78-bae0-d6f166e1446d', 'test-user-001', '2025-05-26T08:00:00Z', '2025-05-26T16:00:00Z', 2000.00, 2731.25, 'completed')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  starting_cash = EXCLUDED.starting_cash,
  ending_cash = EXCLUDED.ending_cash,
  status = EXCLUDED.status;

INSERT INTO shifts (id, store_id, user_id, start_time, end_time, starting_cash, ending_cash, status)
VALUES ('test-shift-002', 'a12a8269-5cbc-4a78-bae0-d6f166e1446d', 'test-user-002', '2025-05-26T12:00:00Z', '2025-05-26T20:00:00Z', 2500.00, 3345.25, 'completed')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  starting_cash = EXCLUDED.starting_cash,
  ending_cash = EXCLUDED.ending_cash,
  status = EXCLUDED.status;

-- Create test shifts for Store 2
INSERT INTO shifts (id, store_id, user_id, start_time, end_time, starting_cash, ending_cash, status)
VALUES ('test-shift-003', 'fd45e07e-7832-4f51-b46b-7ef604359b86', 'test-user-002', '2025-05-26T09:00:00Z', '2025-05-26T17:00:00Z', 1800.00, 2120.00, 'completed')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  starting_cash = EXCLUDED.starting_cash,
  ending_cash = EXCLUDED.ending_cash,
  status = EXCLUDED.status;

INSERT INTO shifts (id, store_id, user_id, start_time, end_time, starting_cash, ending_cash, status)
VALUES ('test-shift-004', 'fd45e07e-7832-4f51-b46b-7ef604359b86', 'test-user-003', '2025-05-26T13:00:00Z', '2025-05-26T21:00:00Z', 2200.00, 2675.50, 'completed')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  starting_cash = EXCLUDED.starting_cash,
  ending_cash = EXCLUDED.ending_cash,
  status = EXCLUDED.status;
