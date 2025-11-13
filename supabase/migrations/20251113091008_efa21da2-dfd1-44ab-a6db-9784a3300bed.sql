
-- Grant yhendanz@thecrofflestore.com admin access to all stores
UPDATE app_users
SET 
  role = 'admin',
  store_ids = ARRAY[
    'e78ad702-1135-482d-a508-88104e2706cf',  -- Gaisano Capital SRP
    'b9c95682-895c-488b-a39a-d62d1d2036ff',  -- Molave Kaffee and Bistro (Main Office)
    'f6ce7fa1-7218-46b3-838d-a9e77ccdb0cd',  -- Robinsons Cybergate Cebu
    'a12a8269-5cbc-4a78-bae0-d6f166e1446d',  -- Robinsons Marasbaras
    'fd45e07e-7832-4f51-b46b-7ef604359b86',  -- Robinsons North
    'c3bfe728-1550-4f4d-af04-12899f3b276b',  -- SM City Cebu
    '607c00e4-59ff-4e97-83f7-579409fd1f6a',  -- SM Savemore Tacloban
    'd7c47e6b-f20a-4543-a6bd-000398f72df5'   -- Sugbo Mercado (IT Park, Cebu)
  ]::uuid[],
  updated_at = NOW()
WHERE email = 'yhendanz@thecrofflestore.com';
