-- Create Cashier and Manager Users for SM Savemore Tacloban
-- Cashier: smtacloban.cashier@thecorffle.com (Password: C4$hierSMTac)
-- Manager: smtacloban.manager@thecroffle.com (Password: M4nag3rSMTac)

DO $$
DECLARE
  cashier_user_id uuid;
  manager_user_id uuid;
  store_id uuid := '607c00e4-59ff-4e97-83f7-579409fd1f6a'; -- SM Savemore Tacloban
BEGIN
  -- Create cashier auth user
  cashier_user_id := extensions.uuid_generate_v4();
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    cashier_user_id,
    '00000000-0000-0000-0000-000000000000',
    'smtacloban.cashier@thecorffle.com',
    crypt('C4$hierSMTac', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"SM Tacloban Cashier","role":"cashier"}'::jsonb,
    'authenticated',
    'authenticated'
  );

  -- Create identity record for cashier
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    cashier_user_id::text,
    cashier_user_id,
    jsonb_build_object('sub', cashier_user_id::text, 'email', 'smtacloban.cashier@thecorffle.com'),
    'email',
    now(),
    now(),
    now()
  );

  -- Create app_user record for cashier using RPC
  PERFORM create_app_user(
    p_user_id := cashier_user_id,
    p_user_email := 'smtacloban.cashier@thecorffle.com',
    p_first_name := 'SM Tacloban',
    p_last_name := 'Cashier',
    p_user_role := 'cashier',
    p_store_ids := ARRAY[store_id],
    p_is_active := true
  );

  -- Create manager auth user
  manager_user_id := extensions.uuid_generate_v4();
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    manager_user_id,
    '00000000-0000-0000-0000-000000000000',
    'smtacloban.manager@thecroffle.com',
    crypt('M4nag3rSMTac', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"SM Tacloban Manager","role":"manager"}'::jsonb,
    'authenticated',
    'authenticated'
  );

  -- Create identity record for manager
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    manager_user_id::text,
    manager_user_id,
    jsonb_build_object('sub', manager_user_id::text, 'email', 'smtacloban.manager@thecroffle.com'),
    'email',
    now(),
    now(),
    now()
  );

  -- Create app_user record for manager using RPC
  PERFORM create_app_user(
    p_user_id := manager_user_id,
    p_user_email := 'smtacloban.manager@thecroffle.com',
    p_first_name := 'SM Tacloban',
    p_last_name := 'Manager',
    p_user_role := 'manager',
    p_store_ids := ARRAY[store_id],
    p_is_active := true
  );

  RAISE NOTICE 'Successfully created cashier (%) and manager (%) for SM Savemore Tacloban', cashier_user_id, manager_user_id;
END $$;