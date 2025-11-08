
-- Fix user_stores data integrity issue
-- Remove duplicate entries with incorrect user_ids

-- Delete the incorrect entry for SM City Cebu cashier
-- Keep only the one that matches app_users.user_id
DELETE FROM user_stores us
WHERE us.store_id = 'c3bfe728-1550-4f4d-af04-12899f3b276b'::uuid
  AND us.user_id NOT IN (
    SELECT au.user_id 
    FROM app_users au 
    WHERE au.email = 'cashier.smcebu@thecroffle.com'
  );

-- Delete the incorrect entry for SM Savemore Tacloban cashier
DELETE FROM user_stores us
WHERE us.store_id = '607c00e4-59ff-4e97-83f7-579409fd1f6a'::uuid
  AND us.user_id NOT IN (
    SELECT au.user_id 
    FROM app_users au 
    WHERE au.email = 'smtacloban.cashier@thecorffle.com'
  );
