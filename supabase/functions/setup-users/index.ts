
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Admin key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Setup test accounts if they don't exist
    const testAccounts = [
      { email: 'admin@example.com', password: 'password123', name: 'Admin User', role: 'admin' },
      { email: 'owner@example.com', password: 'password123', name: 'Owner User', role: 'owner' },
      { email: 'manager@example.com', password: 'password123', name: 'Manager User', role: 'manager' },
      { email: 'cashier@example.com', password: 'password123', name: 'Cashier User', role: 'cashier' },
    ]

    const results = []

    for (const account of testAccounts) {
      // Check if user exists
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', account.email)
        .maybeSingle()

      if (!existingUsers) {
        // Create user in auth.users
        const { data: user, error: createError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
        })

        if (createError) {
          results.push({ email: account.email, status: 'error', message: createError.message })
          continue
        }

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.user.id,
            email: account.email,
            name: account.name,
            role: account.role,
          })

        if (profileError) {
          results.push({ email: account.email, status: 'error', message: profileError.message })
          continue
        }

        // For owner, manager and cashier, create a default store access
        if (account.role !== 'admin') {
          // Get a store
          const { data: stores } = await supabase
            .from('stores')
            .select('id')
            .limit(1)

          if (stores && stores.length > 0) {
            // Add store access
            await supabase
              .from('user_store_access')
              .insert({
                user_id: user.user.id,
                store_id: stores[0].id,
              })
          }
        }

        results.push({ email: account.email, status: 'created' })
      } else {
        results.push({ email: account.email, status: 'exists' })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User setup completed',
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    )
  }
})
