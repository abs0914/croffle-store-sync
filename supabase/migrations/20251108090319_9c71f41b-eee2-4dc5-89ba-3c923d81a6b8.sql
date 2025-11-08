-- Create auth user for SM Tacloban Cashier
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Generate user ID first
  v_user_id := gen_random_uuid();
  
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'smtacloban.cashier@thecroffle.com',
    crypt('C4$hierSMTac', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"SM Tacloban","last_name":"Cashier"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Insert into app_users
  INSERT INTO app_users (
    user_id,
    email,
    first_name,
    last_name,
    role,
    store_ids,
    is_active
  ) VALUES (
    v_user_id,
    'smtacloban.cashier@thecroffle.com',
    'SM Tacloban',
    'Cashier',
    'cashier',
    ARRAY['607c00e4-59ff-4e97-83f7-579409fd1f6a']::uuid[],
    true
  );
  
  -- Insert identity with provider_id
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'smtacloban.cashier@thecroffle.com'),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'User created successfully with ID: %', v_user_id;
END $$;