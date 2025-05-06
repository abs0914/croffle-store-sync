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
    console.log('Edge function called: setup-users');
    
    // Create a Supabase client with the Admin key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user ID from the request if available
    let targetUserId = null
    let requestBody = {}
    
    try {
      requestBody = await req.json()
      targetUserId = requestBody.userId || null
      console.log('Request body:', JSON.stringify(requestBody));
      console.log('Target user ID:', targetUserId);
    } catch (parseError) {
      console.log('No valid JSON body in request, will setup all users');
    }

    // If we have a target user ID but no request for test accounts
    if (targetUserId) {
      console.log(`Setting up user with ID: ${targetUserId}`);
      
      try {
        // Get user from auth.users
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(targetUserId);
        
        if (userError) {
          console.error('Error fetching user:', userError);
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to fetch user: ${userError.message}`,
            }),
            {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              status: 400,
            }
          );
        }
        
        if (!userData || !userData.user) {
          console.error('User not found');
          return new Response(
            JSON.stringify({
              success: false,
              error: 'User not found',
            }),
            {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              status: 404,
            }
          );
        }
        
        const user = userData.user;
        console.log(`Found user: ${user.email}`);
        
        // Check if profile already exists for this user
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileCheckError) {
          console.error('Error checking for existing profile:', profileCheckError);
          throw profileCheckError;
        }
        
        if (existingProfile) {
          console.log('Profile already exists:', existingProfile);
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Profile already exists',
              profile: existingProfile,
            }),
            {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              status: 200,
            }
          );
        }
        
        // Check if we have any stores, and create a default one if not
        const { data: storesCheck } = await supabase
          .from('stores')
          .select('id');
        
        const existingStores = storesCheck || [];
        let defaultStoreId = null;
        
        if (!storesCheck || storesCheck.length === 0) {
          console.log('No stores found, creating default store');
          
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
            .single();
          
          if (storeError) {
            console.error('Error creating default store:', storeError);
          } else {
            console.log('Created default store with ID:', store.id);
            defaultStoreId = store.id;
          }
        } else {
          defaultStoreId = storesCheck[0].id;
          console.log('Using existing store with ID:', defaultStoreId);
        }
        
        // Create a profile for the user based on their email
        const userName = user.email ? user.email.split('@')[0] : 'New User';
        const userRole = 'cashier'; // Default role for new users
        
        const { data: newProfile, error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: userName,
            email: user.email || '',
            role: userRole,
          })
          .select()
          .single();
        
        if (createProfileError) {
          console.error('Error creating profile:', createProfileError);
          throw createProfileError;
        }
        
        console.log('Created new profile:', newProfile);
        
        // Give user access to the default store if it exists
        if (defaultStoreId) {
          const { error: accessError } = await supabase
            .from('user_store_access')
            .insert({
              user_id: user.id,
              store_id: defaultStoreId,
            });
          
          if (accessError) {
            console.error('Error granting store access:', accessError);
          } else {
            console.log('Granted access to store:', defaultStoreId);
          }
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'User profile created successfully',
            profile: newProfile,
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            status: 201,
          }
        );
      } catch (error) {
        console.error('Error in user setup:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error in user setup',
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            status: 500,
          }
        );
      }
    }

    // Setup test accounts (only run this if no specific user was requested)
    const testAccounts = [
      { email: 'admin@example.com', password: 'password123', name: 'Admin User', role: 'admin' },
      { email: 'owner@example.com', password: 'password123', name: 'Owner User', role: 'owner' },
      { email: 'manager@example.com', password: 'password123', name: 'Manager User', role: 'manager' },
      { email: 'cashier@example.com', password: 'password123', name: 'Cashier User', role: 'cashier' },
    ];

    // Process each test account
    for (const account of testAccounts) {
      // If we have a target user ID, we need to see if it matches any of our accounts
      if (targetUserId) {
        // Try to find the user in auth.users
        const { data: userData } = await supabase.auth.admin.getUserById(targetUserId)
        
        // If user exists but doesn't match any of our test accounts by email, skip
        if (userData?.user && !testAccounts.some(acc => acc.email === userData.user.email)) {
          console.log(`Creating custom profile for user ${targetUserId}`)
          
          // Get email from the auth user
          const userEmail = userData.user.email
          
          // Check if profile already exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .maybeSingle()
          
          if (!existingProfile) {
            // Create a basic profile for this user
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: targetUserId,
                email: userEmail,
                name: userEmail?.split('@')[0] || 'User', // Simple name from email
                role: 'cashier', // Default role
              })
            
            if (profileError) {
              console.error('Error creating profile for custom user:', profileError)
              results.push({ id: targetUserId, status: 'error', message: profileError.message })
            } else {
              results.push({ id: targetUserId, status: 'profile_created' })
              
              // Add store access for this user
              if (existingStores.length > 0) {
                await supabase
                  .from('user_store_access')
                  .insert({
                    user_id: targetUserId,
                    store_id: existingStores[0],
                  })
              }
            }
          } else {
            results.push({ id: targetUserId, status: 'profile_exists' })
          }
          
          // We've handled the target user, so we can return now
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
        }
      }

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
        targetUserId: targetUserId || 'none',
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
    console.error('Error in setup-users function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
