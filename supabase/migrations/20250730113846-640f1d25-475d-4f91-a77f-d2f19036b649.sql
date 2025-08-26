-- Step 1: Fix missing user_stores records for all app_users
INSERT INTO user_stores (user_id, store_id)
SELECT 
  au.user_id,
  unnest(au.store_ids) as store_id
FROM app_users au
WHERE au.is_active = true
  AND au.user_id IS NOT NULL
  AND array_length(au.store_ids, 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM user_stores us 
    WHERE us.user_id = au.user_id 
    AND us.store_id = ANY(au.store_ids)
  );

-- Step 2: Create function to automatically sync app_users.store_ids with user_stores
CREATE OR REPLACE FUNCTION sync_user_stores()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing user_stores for this user
  DELETE FROM user_stores WHERE user_id = NEW.user_id;
  
  -- Insert new user_stores records from store_ids array
  IF NEW.store_ids IS NOT NULL AND array_length(NEW.store_ids, 1) > 0 THEN
    INSERT INTO user_stores (user_id, store_id)
    SELECT NEW.user_id, unnest(NEW.store_ids);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to keep user_stores in sync with app_users.store_ids
DROP TRIGGER IF EXISTS sync_user_stores_trigger ON app_users;
CREATE TRIGGER sync_user_stores_trigger
  AFTER INSERT OR UPDATE OF store_ids ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_stores();

-- Step 4: Update products table RLS policies to be more consistent
DROP POLICY IF EXISTS "Users can view products from their stores" ON products;
CREATE POLICY "Users can view products from their stores" 
ON products FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR products.store_id = ANY(au.store_ids)
    )
  )
);

-- Step 5: Update categories table RLS policies to be more consistent  
DROP POLICY IF EXISTS "Users can view categories from their stores" ON categories;
CREATE POLICY "Users can view categories from their stores" 
ON categories FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR categories.store_id = ANY(au.store_ids)
    )
  )
);