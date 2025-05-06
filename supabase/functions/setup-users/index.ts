
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

    // Get user ID from the request if available
    let targetUserId = null
    try {
      const body = await req.json()
      targetUserId = body.userId || null
    } catch {
      // No body or not JSON - that's okay, we'll setup all users
    }

    // Setup test accounts if they don't exist
    const testAccounts = [
      { email: 'admin@example.com', password: 'password123', name: 'Admin User', role: 'admin' },
      { email: 'owner@example.com', password: 'password123', name: 'Owner User', role: 'owner' },
      { email: 'manager@example.com', password: 'password123', name: 'Manager User', role: 'manager' },
      { email: 'cashier@example.com', password: 'password123', name: 'Cashier User', role: 'cashier' },
    ]

    const results = []
    const existingStores = []
    
    // First check if we have any stores, and create a default one if not
    const { data: storesCheck } = await supabase
      .from('stores')
      .select('id')
    
    if (!storesCheck || storesCheck.length === 0) {
      // Create a default store
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: 'Default Store',
          address: '123 Main St, Anytown, USA',
          phone: '555-123-4567',
          email: 'store@example.com'
        })
        .select('id')
        .single()
      
      if (storeError) {
        console.error('Error creating default store:', storeError)
      } else {
        existingStores.push(store.id)
      }
    } else {
      existingStores.push(...storesCheck.map(store => store.id))
    }

    // Process each test account
    for (const account of testAccounts) {
      if (targetUserId) {
        // If we have a target user ID, only process accounts relevant to it
        const { data: userData } = await supabase.auth.admin.getUserById(targetUserId)
        if (!userData.user || userData.user.email !== account.email) {
          continue  // Skip to the next account if this isn't the one we're looking for
        }
      }

      // Check if user exists in auth.users
      let userId
      const { data: existingAuth } = await supabase
        .auth.admin.listUsers()

      const existingAuthUser = existingAuth?.users?.find(u => u.email === account.email)
      
      if (existingAuthUser) {
        userId = existingAuthUser.id
      } else {
        // Create user in auth.users if they don't exist
        const { data: user, error: createError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
        })

        if (createError) {
          results.push({ email: account.email, status: 'error', message: createError.message })
          continue
        }
        
        userId = user.user.id
      }
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: account.email,
            name: account.name,
            role: account.role,
          })

        if (profileError) {
          results.push({ email: account.email, status: 'error', message: profileError.message })
          continue
        }
        
        results.push({ email: account.email, status: 'profile_created' })
      } else {
        results.push({ email: account.email, status: 'profile_exists' })
      }

      // For owner, manager and cashier, create a default store access if it doesn't exist
      if (account.role !== 'admin' && existingStores.length > 0) {
        // Check if store access exists
        const { data: existingAccess } = await supabase
          .from('user_store_access')
          .select('*')
          .eq('user_id', userId)
          .eq('store_id', existingStores[0])
          .maybeSingle()
          
        if (!existingAccess) {
          // Add store access if it doesn't exist
          await supabase
            .from('user_store_access')
            .insert({
              user_id: userId,
              store_id: existingStores[0],
            })
        }
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
    console.error('Error in setup-users function:', error)
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
