
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
        await createAppUserRecord(
          supabaseUser.id,
          email,
          'Admin',
          'User',
          role,
          storeIds,
          true
        );
      } catch (err) {
        console.error('Failed to create app_user for admin:', err);
      }
    } else {
      // For managers, check managers table as fallback
      if (role === 'manager') {
        try {
          const { data: managerData } = await supabase
            .from('managers')
            .select('store_ids, first_name, last_name')
            .eq('email', email)
            .maybeSingle();
          
          if (managerData) {
            console.log('Found manager record:', managerData);
            storeIds = managerData.store_ids || [];
            
            // Create app_user record since it doesn't exist yet
            const names = supabaseUser.user_metadata?.name?.split(' ') || [];
            const firstName = managerData.first_name || names[0] || email.split('@')[0];
            const lastName = managerData.last_name || names.slice(1).join(' ') || '';
            
            try {
              await createAppUserRecord(
                supabaseUser.id,
                email,
                firstName,
                lastName,
                role,
                storeIds,
                true
              );
            } catch (insertErr) {
              console.error('Failed to create app_user:', insertErr);
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
            try {
              await createAppUserRecord(
                supabaseUser.id,
                email,
                cashiersData.first_name,
                cashiersData.last_name,
                role,
                storeIds,
                true
              );
            } catch (insertErr) {
              console.error('Failed to create app_user for cashier:', insertErr);
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
  if (email) {
    try {
      const names = supabaseUser.user_metadata?.name?.split(' ') || [];
      const firstName = names[0] || email.split('@')[0];
      const lastName = names.slice(1).join(' ') || '';
      
      await createAppUserRecord(
        supabaseUser.id,
        email,
        firstName,
        lastName,
        role,
        [],
        true
      );
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

// Helper function to create app_user records and avoid duplicate code
async function createAppUserRecord(
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  role: UserRole,
  storeIds: string[],
  isActive: boolean
) {
  const { error: createError } = await supabase
    .from('app_users')
    .insert({
      user_id: userId,
      email: email,
      first_name: firstName,
      last_name: lastName,
      role: role,
      store_ids: storeIds,
      is_active: isActive
    });
    
  if (createError) {
    console.error('Error creating app_user record:', createError);
  } else {
    console.log('Created new app_user record for:', email);
  }
}

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
