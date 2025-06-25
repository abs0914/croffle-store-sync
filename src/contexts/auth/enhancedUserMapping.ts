
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User } from './types';
import { UserRole } from '@/types';
import { authDebugger, withTimeout } from '@/utils/authDebug';

interface AppUserData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  store_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function enhancedMapSupabaseUser(supabaseUser: SupabaseUser): Promise<User> {
  authDebugger.log('Starting user mapping', { userId: supabaseUser.id, email: supabaseUser.email });
  
  try {
    // Create the query and execute it to get a Promise
    const appUserQuery = supabase
      .from('app_users')
      .select('*')
      .eq('user_id', supabaseUser.id)
      .single();

    // Execute the query and wrap in timeout
    const { data: appUser, error } = await withTimeout(
      appUserQuery,
      10000, // 10 second timeout
      'Database query timeout while fetching user data'
    );

    if (error) {
      authDebugger.log('Database error fetching app user', { 
        error: error.message, 
        code: error.code,
        userId: supabaseUser.id 
      }, 'error');

      // If user doesn't exist in app_users table, create a fallback user
      if (error.code === 'PGRST116') {
        authDebugger.log('User not found in app_users, creating fallback', { userId: supabaseUser.id }, 'warning');
        return createFallbackUser(supabaseUser);
      }

      throw new Error(`Failed to fetch user data: ${error.message}`);
    }

    if (!appUser) {
      authDebugger.log('No app user data returned', { userId: supabaseUser.id }, 'warning');
      return createFallbackUser(supabaseUser);
    }

    // Validate required fields
    if (!validateAppUserData(appUser)) {
      authDebugger.log('Invalid app user data structure', { appUser }, 'error');
      return createFallbackUser(supabaseUser);
    }

    const mappedUser = createUserFromAppData(appUser, supabaseUser);
    authDebugger.log('User mapping successful', { 
      userId: mappedUser.id, 
      role: mappedUser.role,
      storeCount: mappedUser.storeIds.length 
    });

    return mappedUser;
  } catch (error) {
    authDebugger.log('User mapping failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: supabaseUser.id 
    }, 'error');

    // Return fallback user to prevent complete auth failure
    return createFallbackUser(supabaseUser);
  }
}

function validateAppUserData(data: any): data is AppUserData {
  return !!(
    data &&
    data.id &&
    data.user_id &&
    data.email &&
    data.role &&
    Array.isArray(data.store_ids)
  );
}

function createFallbackUser(supabaseUser: SupabaseUser): User {
  authDebugger.log('Creating fallback user', { userId: supabaseUser.id }, 'warning');
  
  const email = supabaseUser.email || 'unknown@example.com';
  const firstName = supabaseUser.user_metadata?.first_name || email.split('@')[0];
  const lastName = supabaseUser.user_metadata?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0];

  return {
    id: supabaseUser.id,
    email,
    firstName,
    lastName,
    name: fullName,
    role: 'staff' as UserRole, // Default role
    storeIds: [], // Empty array - will need store assignment
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createUserFromAppData(appUser: AppUserData, supabaseUser: SupabaseUser): User {
  const firstName = appUser.first_name || '';
  const lastName = appUser.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || appUser.email?.split('@')[0] || 'User';

  return {
    id: appUser.id,
    email: appUser.email || supabaseUser.email || '',
    firstName,
    lastName,
    name: fullName,
    role: appUser.role as UserRole,
    storeIds: appUser.store_ids || [],
    isActive: appUser.is_active !== false,
    createdAt: appUser.created_at || new Date().toISOString(),
    updatedAt: appUser.updated_at || new Date().toISOString(),
  };
}
