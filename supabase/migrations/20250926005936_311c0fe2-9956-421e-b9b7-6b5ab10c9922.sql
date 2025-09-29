-- Assign user to store
-- Update the app_user with UUID e9edd79c-becd-45e6-885d-dbe4cf2aa612 
-- to include store UUID c3bfe728-1550-4f4d-af04-12899f3b276b in their store_ids array

UPDATE app_users 
SET store_ids = array_append(
  COALESCE(store_ids, ARRAY[]::uuid[]), 
  'c3bfe728-1550-4f4d-af04-12899f3b276b'::uuid
),
updated_at = now()
WHERE id = 'e9edd79c-becd-45e6-885d-dbe4cf2aa612'::uuid
AND NOT ('c3bfe728-1550-4f4d-af04-12899f3b276b'::uuid = ANY(COALESCE(store_ids, ARRAY[]::uuid[])));