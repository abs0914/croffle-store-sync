import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      'https://bwmkqscqkfoezcuzgpwq.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const email = 'smtacloban.cashier@thecroffle.com';
    const password = 'C4$hierSMTac';
    const storeId = '607c00e4-59ff-4e97-83f7-579409fd1f6a'; // SM Savemore Tacloban

    console.log('Creating auth user...');

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: 'SM Tacloban',
        last_name: 'Cashier'
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      throw authError;
    }

    console.log('Auth user created:', authData.user.id);

    // Create the app_users record
    const { error: appUserError } = await supabaseAdmin
      .from('app_users')
      .insert({
        user_id: authData.user.id,
        email: email,
        first_name: 'SM Tacloban',
        last_name: 'Cashier',
        role: 'cashier',
        store_ids: [storeId],
        is_active: true
      });

    if (appUserError) {
      console.error('App user creation error:', appUserError);
      throw appUserError;
    }

    console.log('App user record created');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cashier user created successfully',
        user: {
          id: authData.user.id,
          email: email,
          role: 'cashier',
          store: 'SM Savemore Tacloban'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
