
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseAdmin = createClient(
      // Supabase API URL - env var exported by default
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase SERVICE_ROLE KEY - env var exported by default
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create test users with different roles
    const testUsers = [
      {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'admin',
      },
      {
        email: 'owner@example.com',
        password: 'password123',
        name: 'Store Owner',
        role: 'owner',
      },
      {
        email: 'manager@example.com',
        password: 'password123',
        name: 'Store Manager',
        role: 'manager',
      },
      {
        email: 'cashier@example.com',
        password: 'password123',
        name: 'Cashier Staff',
        role: 'cashier',
      },
    ];

    const results = [];

    for (const testUser of testUsers) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(testUser.email);
        
        if (existingUser) {
          results.push({
            email: testUser.email,
            status: 'already exists',
            userId: existingUser.id
          });
          continue;
        }
        
        // Create the user
        const { data: userCreateData, error: userCreateError } = await supabaseAdmin.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
        });
        
        if (userCreateError) throw userCreateError;
        
        // Create profile for the user
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userCreateData.user.id,
            name: testUser.name,
            email: testUser.email,
            role: testUser.role,
          })
          .select();
        
        if (profileError) throw profileError;
        
        // Add store access for non-admin users
        if (testUser.role !== 'admin') {
          // Get all stores
          const { data: stores } = await supabaseAdmin.from('stores').select('id');
          
          if (stores && stores.length > 0) {
            // For owner and manager, give access to all stores
            // For cashier, give access only to the first store
            const storeAccess = testUser.role === 'cashier' 
              ? [{ user_id: userCreateData.user.id, store_id: stores[0].id }]
              : stores.map(store => ({ user_id: userCreateData.user.id, store_id: store.id }));
            
            const { error: accessError } = await supabaseAdmin
              .from('user_store_access')
              .insert(storeAccess);
            
            if (accessError) {
              console.error(`Error assigning store access for ${testUser.email}:`, accessError);
            }
          }
        }
        
        results.push({
          email: testUser.email,
          status: 'created',
          userId: userCreateData.user.id
        });
      } catch (error) {
        console.error(`Error setting up user ${testUser.email}:`, error);
        results.push({
          email: testUser.email,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return new Response(
      JSON.stringify(results),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Failed to set up test users:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500 
      }
    );
  }
})
