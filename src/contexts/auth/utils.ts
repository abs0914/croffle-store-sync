
import { supabase } from "@/integrations/supabase/client";
import { User, UserRole } from "@/types";

/**
 * Maps a user email to a role (temporary solution, to be replaced with database roles)
 */
export const mapUserRole = (email: string): UserRole => {
  if (email === 'admin@example.com') return 'admin';
  if (email === 'owner@example.com') return 'owner';
  if (email.includes('manager') || email === 'rbsons.north.manager@croffle.com') return 'manager';
  if (email === 'marasabaras@croffle.com' || email === 'robinsons.north@croffle.com') return 'cashier';
  return 'cashier'; // Default role
};

/**
 * Maps Supabase user to our app's User type
 */
export const mapSupabaseUser = async (supabaseUser: any): Promise<User> => {
  if (!supabaseUser) {
    throw new Error('No Supabase user provided');
  }
  
  // Get email to determine initial role mapping
  const email = supabaseUser.email;
  let role: UserRole = mapUserRole(email);
  let storeIds: string[] = [];
  
  console.log('Mapping Supabase user:', supabaseUser.email);
  
  try {
    // Try to get user info from the app_users table
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .maybeSingle(); // Use maybeSingle instead of single to avoid 406 errors

    if (error && error.code !== 'PGRST116') { // Ignoring "no rows returned" error
      console.error('Error fetching user info from database:', error);
    } 

    // If user exists in app_users, use that data
    if (data) {
      console.log('Found existing app_user record:', data.email);
      role = data.role as UserRole;
      storeIds = data.store_ids || [];
      
      // Use the name from app_users if available
      const name = `${data.first_name} ${data.last_name}`.trim();
      
      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: name || supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
        role: role,
        storeIds: storeIds,
        avatar: supabaseUser.user_metadata?.avatar_url || 'https://github.com/shadcn.png',
      };
    } 
    
    // Special handling for admin accounts
    if (email === 'admin@example.com') {
      console.log('Admin account detected via email check');
      role = 'admin';
      
      // For admins, fetch all store IDs
      const { data: storesData } = await supabase
        .from('stores')
        .select('id');
        
      if (storesData && storesData.length > 0) {
        storeIds = storesData.map(store => store.id);
      }
      
      // Create app_user record for admin since it doesn't exist yet
      try {
        const { error: createError } = await supabase
          .from('app_users')
          .insert({
            user_id: supabaseUser.id,
            email: email,
            first_name: 'Admin',
            last_name: 'User',
            role: role,
            store_ids: storeIds,
            is_active: true
          });
          
        if (createError) {
          console.error('Error creating admin app_user record:', createError);
        } else {
          console.log('Created new app_user for admin account');
        }
      } catch (err) {
        console.error('Failed to create app_user for admin:', err);
      }
    } else {
      // For manager emails, check managers table as fallback
      if (role === 'manager') {
        try {
          const { data: managerData, error: managerError } = await supabase
            .from('managers')
            .select('store_ids, first_name, last_name')
            .eq('email', supabaseUser.email)
            .maybeSingle();
          
          if (managerError && managerError.code !== 'PGRST116') {
            console.error('Error checking managers data:', managerError);
          }
          
          if (managerData) {
            console.log('Found manager record:', managerData);
            storeIds = managerData.store_ids || [];
            
            // Create app_user record since it doesn't exist yet
            const names = supabaseUser.user_metadata?.name?.split(' ') || [];
            const firstName = managerData.first_name || names[0] || email.split('@')[0];
            const lastName = managerData.last_name || names.slice(1).join(' ') || '';
            
            const { data: newAppUser, error: createError } = await supabase
              .from('app_users')
              .insert({
                user_id: supabaseUser.id,
                email: email,
                first_name: firstName,
                last_name: lastName,
                role: role,
                store_ids: storeIds,
                is_active: true
              })
              .select()
              .single();
              
            if (createError) {
              console.error('Error creating app_user record:', createError);
            } else {
              console.log('Created new app_user from manager record:', newAppUser);
              
              // Use the newly created app_user data
              return {
                id: supabaseUser.id,
                email: supabaseUser.email,
                name: `${firstName} ${lastName}`.trim(),
                role: role,
                storeIds: storeIds,
                avatar: supabaseUser.user_metadata?.avatar_url || 'https://github.com/shadcn.png',
              };
            }
          }
        } catch (error) {
          console.error('Error checking managers data:', error);
        }
      } else if (role === 'cashier') {
        // Similar handling for cashiers
        try {
          const { data: cashiersData } = await supabase
            .from('cashiers')
            .select('store_id, first_name, last_name')
            .eq('email', email)
            .maybeSingle();
            
          if (cashiersData) {
            storeIds = [cashiersData.store_id];
            
            // Create app_user record
            const { error: createError } = await supabase
              .from('app_users')
              .insert({
                user_id: supabaseUser.id,
                email: email,
                first_name: cashiersData.first_name,
                last_name: cashiersData.last_name,
                role: role,
                store_ids: storeIds,
                is_active: true
              });
              
            if (createError) {
              console.error('Error creating app_user record for cashier:', createError);
            } else {
              console.log('Created new app_user from cashier record');
            }
          }
        } catch (error) {
          console.error('Error checking cashier data:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking app_users data:', error);
  }

  // Create a new default app_user if we haven't created one yet
  if (email && !storeIds.length) {
    try {
      const names = supabaseUser.user_metadata?.name?.split(' ') || [];
      const firstName = names[0] || email.split('@')[0];
      const lastName = names.slice(1).join(' ') || '';
      
      const { error: createError } = await supabase
        .from('app_users')
        .insert({
          user_id: supabaseUser.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: role,
          store_ids: [],
          is_active: true
        });
        
      if (createError) {
        console.error('Error creating default app_user record:', createError);
      } else {
        console.log('Created default app_user record for:', email);
      }
    } catch (err) {
      console.error('Failed to create default app_user:', err);
    }
  }

  // Return the user with the determined role and store access
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
    role: role,
    storeIds: storeIds,
    avatar: supabaseUser.user_metadata?.avatar_url || 'https://github.com/shadcn.png',
  };
};

/**
 * Checks if a user has permission based on role hierarchy
 */
export const checkPermission = (userRole: UserRole | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    owner: 3,
    manager: 2,
    cashier: 1
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Checks if a user has access to a specific store
 */
export const checkStoreAccess = (userStoreIds: string[] | undefined, storeId: string): boolean => {
  if (!userStoreIds) return false;
  return userStoreIds.includes(storeId);
};
