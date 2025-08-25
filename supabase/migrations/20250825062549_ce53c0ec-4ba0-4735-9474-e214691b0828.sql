-- Fix database permission issues for inventory sync
-- Focus on syncing missing app_users records which is the root cause

-- Create a function to ensure all authenticated users have app_users records
CREATE OR REPLACE FUNCTION public.sync_missing_app_users()
RETURNS TABLE(synced_count integer, error_details text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sync_count integer := 0;
  auth_user record;
BEGIN
  -- Get auth users that don't have app_users records
  FOR auth_user IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN app_users au ON u.id = au.user_id
    WHERE au.user_id IS NULL
    AND u.email IS NOT NULL
  LOOP
    BEGIN
      -- Create missing app_user record
      INSERT INTO app_users (
        user_id,
        email,
        first_name,
        last_name,
        role,
        store_ids,
        is_active
      ) VALUES (
        auth_user.id,
        auth_user.email,
        COALESCE(auth_user.raw_user_meta_data->>'first_name', split_part(auth_user.email, '@', 1)),
        COALESCE(auth_user.raw_user_meta_data->>'last_name', ''),
        'cashier'::app_role,
        '{}',
        true
      );
      
      sync_count := sync_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue
      RAISE NOTICE 'Failed to sync user %: %', auth_user.email, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT sync_count, NULL::text;
END;
$$;

-- Sync any missing app_users records to fix permission issues
SELECT * FROM sync_missing_app_users();

-- Also ensure the Sugbo Mercado store has proper user access
-- Update the cashier.itpark user to have access to Sugbo Mercado store
UPDATE app_users 
SET store_ids = array_append(store_ids, 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid)
WHERE email = 'cashier.itpark@thecroffle.com'
  AND NOT ('d7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid = ANY(store_ids));